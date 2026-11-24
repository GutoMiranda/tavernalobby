"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/auth";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";

function valor(dados: FormData, campo: string, max = 80) {
  return String(dados.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

export async function decidirMembro(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const aprovar = dados.get("decisao") === "aprovar";
  const { error } = await supabase.rpc("approve_member", {
    p_person_id: valor(dados, "id", 40),
    p_approve: aprovar,
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/admin/membros");
  return { ok: aprovar ? "Aprovado!" : "Acesso recusado." };
}

export async function atribuirTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const tag = valor(dados, "tag", 40);
  if (!tag) return { erro: "Escolha uma tag." };
  const { error } = await supabase.rpc("assign_tag", { p_person_id: valor(dados, "id", 40), p_tag_id: tag });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/admin/membros");
  return { ok: "Tag atribuída." };
}

export async function removerTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("remove_tag", {
    p_person_id: valor(dados, "id", 40),
    p_tag_id: valor(dados, "tag", 40),
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/admin/membros");
  return { ok: "Tag removida." };
}

export async function criarTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const nome = valor(dados, "nome", 40);
  if (!nome) return { erro: "Informe o nome da tag." };
  const { error } = await supabase.from("tags").insert({
    name: nome,
    label: valor(dados, "rotulo", 60) || null,
    description: valor(dados, "descricao", 200) || null,
    created_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/admin/membros");
  return { ok: `Tag "${nome}" criada.` };
}

export async function novoCodigoConvite(_: EstadoAcao): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("regenerate_invite_code");
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/admin/membros");
  return { ok: "Novo link gerado. O link antigo não funciona mais." };
}
