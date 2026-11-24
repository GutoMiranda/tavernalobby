"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin, exigirMembro } from "@/lib/auth";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { diasDoPeriodo } from "@/lib/format";

const UUID = /^[0-9a-f-]{36}$/i;
const CATEGORIAS = ["acomodacao", "alimentacao", "alcool", "extra"] as const;

function txt(d: FormData, campo: string, max = 200) {
  return String(d.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

function atualizar(eventId: string) {
  revalidatePath(`/aventuras/${eventId}`, "layout");
}

// ---------------------------------------------------------------- presença

/**
 * Salva a presença de várias pessoas de uma vez (o núcleo inteiro).
 * Campos por pessoa: status_<id>, dias_<id> ("todo" ou número), alcool_<id>.
 * A permissão (só o próprio núcleo, ou admin) é garantida pelo RLS.
 */
export async function salvarPresenca(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const ids = d
    .getAll("pessoa")
    .map(String)
    .filter((id) => UUID.test(id));
  if (!UUID.test(eventId) || ids.length === 0) return { erro: "Nada para salvar." };

  const { data: evento } = await supabase.from("events").select("start_date, end_date").eq("id", eventId).maybeSingle();
  const maximo = evento?.start_date && evento?.end_date ? diasDoPeriodo(evento.start_date, evento.end_date) : null;

  for (const id of ids) {
    const status = txt(d, `status_${id}`, 10);
    if (!["pendente", "vai", "nao_vai"].includes(status)) return { erro: "Escolha se vai ou não." };
    const diasTxt = txt(d, `dias_${id}`, 3);
    let days: number | null = null;
    if (diasTxt && diasTxt !== "todo") {
      const n = Number(diasTxt);
      if (!Number.isInteger(n) || n < 1) return { erro: "Os dias precisam ser um número a partir de 1." };
      if (maximo && n > maximo) return { erro: `O período tem ${maximo} dias; escolha até ${maximo}.` };
      days = maximo && n === maximo ? null : n;
    }
    const valores = {
      status,
      days: status === "vai" ? days : null,
      alcohol_opt_in: status === "vai" && d.get(`alcool_${id}`) === "on",
      updated_by: pessoa.id,
    };
    // Sem upsert: a coluna da chave (event_id, person_id) não é atualizável pelo usuário.
    const { error, count } = await supabase
      .from("attendances")
      .update(valores, { count: "exact" })
      .eq("event_id", eventId)
      .eq("person_id", id);
    if (error) return { erro: mensagemErro(error) };
    if (!count) {
      const { error: e2 } = await supabase.from("attendances").insert({ event_id: eventId, person_id: id, ...valores });
      if (e2) return { erro: mensagemErro(e2) };
    }
  }
  atualizar(eventId);
  return { ok: "Presença salva." };
}

// ---------------------------------------------------------------- itens de custo (admin)

function camposItem(d: FormData) {
  const category = txt(d, "categoria", 20) as (typeof CATEGORIAS)[number];
  const amount = reaisParaCentavos(txt(d, "valor", 20));
  const eligibility = category === "extra" && d.get("opt_in") === "on" ? "opt_in" : "presentes";
  return {
    erro: !CATEGORIAS.includes(category)
      ? "Escolha a categoria."
      : !txt(d, "descricao")
        ? "Descreva o item."
        : amount == null
          ? "Informe o valor em reais (ex.: 1.234,56)."
          : null,
    valores: {
      category,
      description: txt(d, "descricao", 200),
      amount_cents: amount ?? 0,
      eligibility,
      proportional_to_days: d.get("proporcional") === "on",
    },
  };
}

export async function criarItemCusto(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { erro, valores } = camposItem(d);
  if (erro) return { erro };
  const { error } = await supabase
    .from("cost_items")
    .insert({ event_id: eventId, ...valores, created_by: pessoa.id, updated_by: pessoa.id });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Item adicionado." };
}

export async function editarItemCusto(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { erro, valores } = camposItem(d);
  if (erro) return { erro };
  const { error } = await supabase
    .from("cost_items")
    .update({ ...valores, updated_by: pessoa.id })
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Item salvo." };
}

export async function removerItemCusto(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { error } = await supabase
    .from("cost_items")
    .delete()
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Item removido." };
}

/** Cria o item de acomodação com o preço da estalagem escolhida (proporcional aos dias). */
export async function custoDaEstalagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { data: ev } = await supabase.from("events").select("chosen_accommodation_id").eq("id", eventId).maybeSingle();
  if (!ev?.chosen_accommodation_id) return { erro: "Escolha a estalagem primeiro." };
  const { data: est } = await supabase
    .from("accommodations")
    .select("name, total_price_cents")
    .eq("id", ev.chosen_accommodation_id)
    .maybeSingle();
  if (!est) return { erro: "Estalagem não encontrada." };
  const { error } = await supabase.from("cost_items").insert({
    event_id: eventId,
    category: "acomodacao",
    description: `Estalagem: ${est.name}`,
    amount_cents: est.total_price_cents,
    eligibility: "presentes",
    proportional_to_days: true,
    created_by: pessoa.id,
    updated_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Acomodação adicionada aos custos." };
}

/** Ajusta o peso de uma pessoa num item (1 = normal; volta ao padrão apagando o ajuste). */
export async function ajustarPeso(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const item = txt(d, "item", 40);
  const alvo = txt(d, "pessoa", 40);
  const peso = Number(txt(d, "peso", 6).replace(",", "."));
  if (!Number.isFinite(peso) || peso < 0 || peso > 99) return { erro: "Peso entre 0 e 99 (ex.: 0,5)." };
  const { error } =
    peso === 1
      ? await supabase.from("cost_weights").delete().eq("cost_item_id", item).eq("person_id", alvo)
      : await supabase.from("cost_weights").upsert({
          cost_item_id: item,
          person_id: alvo,
          weight: peso,
          updated_by: pessoa.id,
          updated_at: new Date().toISOString(),
        });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Peso salvo." };
}

// ---------------------------------------------------------------- adesão a extras

/** Marca ou desmarca a adesão das pessoas do núcleo a um extra opt-in. Campos: item, pessoa (vários), aderir_<id>. */
export async function salvarAdesoes(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const item = txt(d, "item", 40);
  const ids = d
    .getAll("pessoa")
    .map(String)
    .filter((id) => UUID.test(id));
  for (const id of ids) {
    const quer = d.get(`aderir_${id}`) === "on";
    const { error } = quer
      ? await supabase
          .from("cost_item_optins")
          .upsert({ cost_item_id: item, person_id: id, created_by: pessoa.id }, { ignoreDuplicates: true })
      : await supabase.from("cost_item_optins").delete().eq("cost_item_id", item).eq("person_id", id);
    if (error) return { erro: mensagemErro(error) };
  }
  atualizar(eventId);
  return { ok: "Adesão salva." };
}
