"use server";

import { revalidatePath } from "next/cache";

import { exigirMembro } from "@/lib/auth";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { CATEGORIAS_ARMAZEM, IDS_UNIDADES } from "@/lib/finance/armazem";

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
  unit: string;
  unit_price_cents: number | null;
  quantity: number | null;
  quantity_per_person: number | null;
  is_alcoholic: boolean;
};

function lerItem(d: FormData): Campos | string {
  const name = txt(d, "nome", 120);
  if (!name) return "Informe o nome do item.";
  const unidade = txt(d, "unidade", 20);
  if (!IDS_UNIDADES.includes(unidade)) return "Escolha a unidade.";
  const categoria = txt(d, "categoria", 40);
  const precoTxt = txt(d, "preco", 20);
  const preco = precoTxt ? reaisParaCentavos(precoTxt) : null;
  if (precoTxt && preco == null) return "Informe o preço por unidade em reais (ex.: 59,90).";
  const quantidade = numero(d, "quantidade");
  if (quantidade === false) return "Quantidade: use um número (ex.: 8,5).";
  const porPessoa = numero(d, "por_pessoa");
  if (porPessoa === false) return "Consumo por pessoa por dia: use um número (ex.: 0,4) ou deixe vazio.";
  return {
    name,
    category: (CATEGORIAS_ARMAZEM as readonly string[]).includes(categoria) ? categoria : null,
    unit: unidade,
    unit_price_cents: preco,
    quantity: quantidade,
    quantity_per_person: porPessoa,
    is_alcoholic: d.get("alcoolico") === "on",
  };
}

export async function criarItemArmazem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  if (!UUID.test(eventId)) return { erro: "Aventura inválida." };
  const campos = lerItem(d);
  if (typeof campos === "string") return { erro: campos };
  const { error } = await supabase.from("pantry_items").insert({ ...campos, event_id: eventId, created_by: pessoa.id });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Item adicionado à lista." };
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

/** Usa a quantidade sugerida no item. */
export async function usarSugestao(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const quantidade = numero(d, "quantidade");
  if (!quantidade) return { erro: "Sugestão inválida." };
  const { error } = await supabase
    .from("pantry_items")
    .update({ quantity: quantidade })
    .eq("id", txt(d, "id", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Quantidade atualizada." };
}

/** Exclui um ou vários itens (campo "id" repetido). O RLS deixa só autor, admin ou tag Despensa. */
export async function removerItensArmazem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const ids = d
    .getAll("id")
    .map(String)
    .filter((id) => UUID.test(id))
    .slice(0, 500);
  if (ids.length === 0) return { erro: "Selecione ao menos um item." };
  const { data, error } = await supabase.from("pantry_items").delete().in("id", ids).select("id");
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  const feitos = data?.length ?? 0;
  const negados = ids.length - feitos;
  if (feitos === 0) return { erro: "Só quem criou o item, o admin ou o Guardião do Armazém (tag Despensa) excluem." };
  return {
    ok:
      `${feitos} ${feitos === 1 ? "item excluído" : "itens excluídos"}.` +
      (negados ? ` ${negados} não ${negados === 1 ? "pôde" : "puderam"} ser excluídos (sem permissão).` : ""),
  };
}
