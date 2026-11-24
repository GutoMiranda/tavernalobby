"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAdmin, exigirMembro } from "@/lib/auth";
import { FASES, type Fase } from "@/lib/aventura";
import { lerDatasCandidatas } from "@/lib/datas-candidatas";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { type RotaResumo, rotasEmCache } from "@/lib/rotas";

function txt(d: FormData, campo: string, max = 200) {
  return String(d.get(campo) ?? "")
    .trim()
    .slice(0, max);
}
function dataOuNull(d: FormData, campo: string) {
  const v = txt(d, campo, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
function numeroOuNull(d: FormData, campo: string) {
  const v = txt(d, campo, 30);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** Prazo digitado como data (dd/mm) vale até o fim do dia em São Paulo. */
function prazoOuNull(d: FormData, campo: string) {
  const v = dataOuNull(d, campo);
  return v ? `${v}T23:59:59-03:00` : null;
}

function camposAventura(d: FormData) {
  return {
    name: txt(d, "nome", 120),
    description: txt(d, "descricao", 2000) || null,
    region: txt(d, "regiao", 120) || null,
    date_vote_deadline: prazoOuNull(d, "prazo_datas"),
    accommodation_vote_deadline: prazoOuNull(d, "prazo_estalagens"),
  };
}

export async function criarAventura(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const campos = camposAventura(d);
  if (!campos.name) return { erro: "Dê um nome para a aventura." };
  const lidas = lerDatasCandidatas(d);
  if ("erro" in lidas) return { erro: lidas.erro };
  const { datas } = lidas;

  const { data, error } = await supabase
    .from("events")
    .insert({
      ...campos,
      // Período candidato = da primeira à última data candidata.
      candidate_start: datas.length ? datas.map((x) => x.start_date).sort()[0] : null,
      candidate_end: datas.length
        ? datas
            .map((x) => x.end_date)
            .sort()
            .at(-1)
        : null,
      created_by: pessoa.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { erro: mensagemErro(error) };
  if (datas.length) {
    const { error: e2 } = await supabase
      .from("date_options")
      .insert(datas.map((x) => ({ ...x, event_id: data.id, created_by: pessoa.id })));
    if (e2) return { erro: `A aventura foi criada, mas as datas não: ${mensagemErro(e2)}` };
  }
  revalidatePath("/aventuras");
  redirect(`/aventuras/${data.id}`);
}

export async function editarAventura(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const id = txt(d, "id", 40);
  const campos = camposAventura(d);
  if (!campos.name) return { erro: "Dê um nome para a aventura." };
  const fase = txt(d, "fase", 20) as Fase;
  const { error } = await supabase
    .from("events")
    .update({ ...campos, ...(FASES.includes(fase) ? { phase: fase } : {}) })
    .eq("id", id);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${id}`, "layout");
  return { ok: "Aventura salva." };
}

// ---------------------------------------------------------------- datas

export async function adicionarData(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const inicio = dataOuNull(d, "inicio");
  const fim = dataOuNull(d, "fim") ?? inicio;
  if (!inicio || !fim) return { erro: "Informe a data de início." };
  if (fim < inicio) return { erro: "A data final precisa ser depois da inicial." };
  const { error } = await supabase.from("date_options").insert({
    event_id: eventId,
    start_date: inicio,
    end_date: fim,
    note: txt(d, "nota", 200) || null,
    created_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Data candidata adicionada." };
}

export async function removerData(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase
    .from("date_options")
    .delete()
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${txt(d, "evento", 40)}`, "layout");
  return { ok: "Removida." };
}

export async function fecharDatas(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { data: opcao, error: e1 } = await supabase
    .from("date_options")
    .select("id, start_date, end_date")
    .eq("id", txt(d, "id", 40))
    .eq("event_id", eventId)
    .single<{ id: string; start_date: string; end_date: string }>();
  if (e1 || !opcao) return { erro: "Data não encontrada." };
  const { error } = await supabase
    .from("events")
    .update({
      chosen_date_option_id: opcao.id,
      start_date: opcao.start_date,
      end_date: opcao.end_date,
      phase: "estalagens",
    })
    .eq("id", eventId);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Data definida! A aventura seguiu para a escolha da estalagem." };
}

// ---------------------------------------------------------------- reações

export async function reagir(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const tipo = txt(d, "tipo", 20);
  const alvo = txt(d, "alvo", 40);
  const valor = Number(d.get("valor")) === -1 ? -1 : 1;
  const atual = Number(d.get("atual") ?? 0);

  const [tabela, coluna] =
    tipo === "data" ? ["date_reactions", "date_option_id"] : ["accommodation_reactions", "accommodation_id"];

  const { error } =
    atual === valor
      ? // Tocar de novo na mesma reação desfaz.
        await supabase.from(tabela).delete().eq(coluna, alvo).eq("person_id", pessoa.id)
      : await supabase
          .from(tabela)
          .upsert({ [coluna]: alvo, person_id: pessoa.id, value: valor }, { onConflict: `${coluna},person_id` });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${txt(d, "evento", 40)}`, "layout");
  return {};
}

// ---------------------------------------------------------------- estalagens

function fotos(d: FormData) {
  return txt(d, "fotos", 4000)
    .split(/\s+/)
    .filter((u) => /^https:\/\/\S+$/i.test(u))
    .slice(0, 8);
}

function urlOuNull(v: string) {
  return /^https?:\/\/\S+$/i.test(v) ? v : null;
}

function camposEstalagem(d: FormData) {
  const nome = txt(d, "nome", 120);
  const preco = reaisParaCentavos(txt(d, "preco", 30));
  if (!nome) return { erro: "Dê um nome para a estalagem." };
  if (preco === null) return { erro: "Informe o preço total em reais (ex.: 3.000,00)." };
  const capacidade = numeroOuNull(d, "capacidade");
  const linkTexto = txt(d, "link", 500);
  if (linkTexto && !urlOuNull(linkTexto)) return { erro: "O link precisa começar com https://" };
  return {
    campos: {
      name: nome,
      url: urlOuNull(linkTexto),
      address: txt(d, "lugar_texto", 300) || null,
      lat: numeroOuNull(d, "lugar_lat"),
      lng: numeroOuNull(d, "lugar_lng"),
      place_id: txt(d, "lugar_id", 300) || null,
      total_price_cents: preco,
      capacity: capacidade && capacidade > 0 ? Math.floor(capacidade) : null,
      photos: fotos(d),
      notes: txt(d, "notas", 2000) || null,
    },
  };
}

export async function adicionarEstalagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const r = camposEstalagem(d);
  if ("erro" in r) return { erro: r.erro };
  const { error } = await supabase
    .from("accommodations")
    .insert({ ...r.campos, event_id: eventId, created_by: pessoa.id });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Estalagem adicionada. Agora a party pode reagir!" };
}

export async function editarEstalagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const r = camposEstalagem(d);
  if ("erro" in r) return { erro: r.erro };
  const { error, count } = await supabase
    .from("accommodations")
    .update(r.campos, { count: "exact" })
    .eq("id", txt(d, "id", 40))
    .eq("event_id", eventId);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Só quem cadastrou ou o admin pode editar." };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Estalagem atualizada." };
}

export async function removerEstalagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error, count } = await supabase
    .from("accommodations")
    .delete({ count: "exact" })
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Só quem cadastrou ou o admin pode remover." };
  revalidatePath(`/aventuras/${txt(d, "evento", 40)}`, "layout");
  return { ok: "Removida." };
}

export async function escolherEstalagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { error } = await supabase
    .from("events")
    .update({ chosen_accommodation_id: txt(d, "id", 40), phase: "presenca" })
    .eq("id", eventId);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Estalagem escolhida! Agora é confirmar a presença." };
}

// ---------------------------------------------------------------- preencher pelo link

export type DadosPreenchidos = {
  erro?: string;
  aviso?: string;
  nome?: string;
  descricao?: string;
  fotos?: string[];
  preco?: string;
  capacidade?: number;
  endereco?: string;
  lat?: number;
  lng?: number;
  lugarId?: string;
};

/** Lê o anúncio (Open Graph/JSON-LD) e, se faltar localização, procura pelo nome no Google. */
export async function lerAnuncio(link: string, nomeDigitado: string): Promise<DadosPreenchidos> {
  await exigirMembro();
  const { preencherPorAnuncio } = await import("@/lib/buscar-anuncio");
  const { centavosParaCampo } = await import("@/lib/dinheiro");
  if (!/^https?:\/\/\S+$/i.test(link.trim())) return { erro: "Cole um link que comece com https://" };

  const r = await preencherPorAnuncio(link.trim(), nomeDigitado.trim() || undefined);
  const achou = [
    r.nome && "nome",
    r.descricao && "descrição",
    r.fotos.length && "fotos",
    r.precoCentavos && "preço",
    r.capacidade && "capacidade",
    r.lat !== undefined && (r.origemLocal === "anuncio" ? "localização do anúncio" : "endereço pelo Google"),
  ].filter(Boolean) as string[];

  let aviso: string;
  if (!r.paginaLida && !r.lat) {
    aviso =
      "O site do anúncio não deixou ler a página (alguns, como o Booking, bloqueiam robôs). Preencha à mão ou digite o nome e tente de novo para buscar o endereço.";
  } else if (achou.length === 0) {
    aviso = "Não encontrei dados nesse anúncio. Preencha à mão.";
  } else {
    aviso = `Preenchido: ${achou.join(", ")}. Confira tudo antes de salvar${r.origemLocal === "busca" ? ", principalmente o endereço (achado pelo nome)" : ""}.`;
  }

  return {
    aviso,
    nome: r.nome,
    descricao: r.descricao,
    fotos: r.fotos,
    preco: r.precoCentavos ? centavosParaCampo(r.precoCentavos) : undefined,
    capacidade: r.capacidade,
    endereco: r.endereco,
    lat: r.lat,
    lng: r.lng,
    lugarId: r.lugarId,
  };
}

// ---------------------------------------------------------------- ponto de encontro

export async function salvarPontoEncontro(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const quando = txt(d, "quando", 16); // datetime-local: AAAA-MM-DDTHH:MM (horário de São Paulo)
  const { error } = await supabase
    .from("events")
    .update({
      meeting_name: txt(d, "nome", 120) || null,
      meeting_address: txt(d, "lugar_texto", 300) || null,
      meeting_lat: numeroOuNull(d, "lugar_lat"),
      meeting_lng: numeroOuNull(d, "lugar_lng"),
      meeting_place_id: txt(d, "lugar_id", 300) || null,
      meeting_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(quando) ? `${quando}:00-03:00` : null,
      meeting_notes: txt(d, "notas", 1000) || null,
    })
    .eq("id", eventId);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath(`/aventuras/${eventId}`, "layout");
  return { ok: "Ponto de encontro salvo." };
}

// ---------------------------------------------------------------- rotas do painel

export type RotasDaEstalagem = {
  /** Da cidade de saída do meu núcleo até a estalagem (null se o núcleo não tem origem). */
  daCidade: RotaResumo[] | null;
  /** Do ponto de encontro até a estalagem (null se não há ponto de encontro). */
  doEncontro: RotaResumo[] | null;
};

const MODOS_PAINEL = ["DRIVE", "TWO_WHEELER", "TRANSIT", "WALK"] as const;

/** Rotas até uma estalagem, calculadas no servidor quando alguém toca nela no painel. */
export async function rotasDaEstalagem(eventoId: string, estalagemId: string): Promise<RotasDaEstalagem> {
  const { supabase, pessoa } = await exigirMembro();
  const [{ data: est }, { data: ev }, { data: nucleo }] = await Promise.all([
    supabase.from("accommodations").select("lat, lng").eq("id", estalagemId).eq("event_id", eventoId).maybeSingle(),
    supabase.from("events").select("meeting_lat, meeting_lng").eq("id", eventoId).maybeSingle(),
    supabase.from("households").select("origin_lat, origin_lng").eq("id", pessoa.household_id).maybeSingle(),
  ]);
  if (est?.lat == null || est?.lng == null) return { daCidade: null, doEncontro: null };
  const destino = { lat: est.lat as number, lng: est.lng as number };
  const modos = [...MODOS_PAINEL];
  const [daCidade, doEncontro] = await Promise.all([
    nucleo?.origin_lat != null && nucleo?.origin_lng != null
      ? rotasEmCache({ lat: nucleo.origin_lat as number, lng: nucleo.origin_lng as number }, destino, modos).catch(
          () => [],
        )
      : null,
    ev?.meeting_lat != null && ev?.meeting_lng != null
      ? rotasEmCache({ lat: ev.meeting_lat as number, lng: ev.meeting_lng as number }, destino, modos).catch(() => [])
      : null,
  ]);
  return { daCidade, doEncontro };
}
