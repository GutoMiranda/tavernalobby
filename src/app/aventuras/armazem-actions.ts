"use server";

import { revalidatePath } from "next/cache";

import { exigirMembro } from "@/lib/auth";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { CATEGORIAS_ARMAZEM } from "@/lib/finance/armazem";

const UUID = /^[0-9a-f-]{36}$/i;

function txt(d: FormData, campo: string, max = 200) {
  return String(d.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

function atualizar(eventId: string) {
  revalidatePath(`/aventuras/${eventId}`, "layout");
}

/** Número decimal positivo em formato brasileiro ("0,3", "1.5"). Vazio = null; inválido = false. */
function numero(d: FormData, campo: string): number | null | false {
  const t = txt(d, campo, 12).replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > 99999) return false;
  return Math.round(n * 100) / 100;
}

type Campos = {
  name: string;
  category: string | null;
  quantity_per_person: number | null;
  quantity: number | null;
  unit: string | null;
  is_alcoholic: boolean;
  cost_cents: number | null;
};

function lerItem(d: FormData): Campos | string {
  const name = txt(d, "nome", 120);
  if (!name) return "Informe o nome do item.";
  const categoria = txt(d, "categoria", 40);
  const porPessoa = numero(d, "por_pessoa");
  const quantidade = numero(d, "quantidade");
  if (porPessoa === false) return "Quantidade por pessoa por dia: use um número (ex.: 0,3).";
  if (quantidade === false) return "Quantidade total: use um número (ex.: 12).";
  const custoTxt = txt(d, "custo", 20);
  const custo = custoTxt ? reaisParaCentavos(custoTxt) : null;
  if (custoTxt && custo == null) return "Informe o custo em reais (ex.: 250,00) ou deixe vazio.";
  return {
    name,
    category: (CATEGORIAS_ARMAZEM as readonly string[]).includes(categoria) ? categoria : null,
    quantity_per_person: porPessoa,
    quantity: quantidade,
    unit: txt(d, "unidade", 20) || null,
    is_alcoholic: d.get("alcoolico") === "on",
    cost_cents: custo,
  };
}

export async function criarItemArmazem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  if (!UUID.test(eventId)) return { erro: "Aventura inválida." };
  const campos = lerItem(d);
  if (typeof campos === "string") return { erro: campos };
  const { error } = await supabase.from("pantry_items").insert({
    ...campos,
    event_id: eventId,
    created_by: pessoa.id,
    responsible_person_id: d.get("eu_levo") === "on" ? pessoa.id : null,
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Item guardado no armazém." };
}

export async function editarItemArmazem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const campos = lerItem(d);
  if (typeof campos === "string") return { erro: campos };
  const { data, error } = await supabase
    .from("pantry_items")
    .update(campos)
    .eq("id", txt(d, "id", 40))
    .select("id");
  if (error) return { erro: mensagemErro(error) };
  if (!data?.length) return { erro: "Item não encontrado." };
  atualizar(eventId);
  return { ok: "Item atualizado." };
}

/** Define o responsável: vazio = ninguém; "eu" = quem clicou; ou o id de uma pessoa aprovada. */
export async function definirResponsavel(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const escolha = txt(d, "responsavel", 40);
  const responsavel = escolha === "eu" ? pessoa.id : UUID.test(escolha) ? escolha : null;
  const { error } = await supabase
    .from("pantry_items")
    .update({ responsible_person_id: responsavel })
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: responsavel ? "Responsável definido." : "Item sem responsável." };
}

export async function marcarComprado(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const comprado = txt(d, "comprado", 5) === "sim";
  const { error } = await supabase
    .from("pantry_items")
    .update({ purchased: comprado })
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: comprado ? "Marcado como comprado." : "Marcado como não comprado." };
}

export async function removerItemArmazem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const { data, error } = await supabase
    .from("pantry_items")
    .delete()
    .eq("id", txt(d, "id", 40))
    .select("id");
  if (error) return { erro: mensagemErro(error) };
  if (!data?.length) return { erro: "Só quem criou o item, o admin ou o Guardião do Armazém (tag Despensa) removem." };
  atualizar(eventId);
  return { ok: "Item removido." };
}
