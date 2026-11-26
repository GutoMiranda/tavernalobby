"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin, exigirPermissao } from "@/lib/auth";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { AREAS, normalizarPermissao } from "@/lib/permissoes";

const UUID = /^[0-9a-f-]{36}$/i;

function valor(dados: FormData, campo: string, max = 80) {
  return String(dados.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

export async function decidirMembro(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("membros", "editar");
  const aprovar = dados.get("decisao") === "aprovar";
  const { error } = await supabase.rpc("approve_member", {
    p_person_id: valor(dados, "id", 40),
    p_approve: aprovar,
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/mestre", "layout");
  return { ok: aprovar ? "Aprovado!" : "Acesso recusado." };
}

export async function atribuirTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const tag = valor(dados, "tag", 40);
  if (!tag) return { erro: "Escolha uma tag." };
  const { error } = await supabase.rpc("assign_tag", { p_person_id: valor(dados, "id", 40), p_tag_id: tag });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/mestre", "layout");
  return { ok: "Tag atribuída." };
}

export async function removerTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("remove_tag", {
    p_person_id: valor(dados, "id", 40),
    p_tag_id: valor(dados, "tag", 40),
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/mestre", "layout");
  return { ok: "Tag removida." };
}

export async function novoCodigoConvite(_: EstadoAcao): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("membros", "editar");
  const { error } = await supabase.rpc("regenerate_invite_code");
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/mestre", "layout");
  return { ok: "Novo link gerado. O link antigo não funciona mais." };
}

/** Salva as permissões de uma pessoa, aba por aba (campos "<area>:ver|editar|excluir"). O banco confere quem pode. */
export async function salvarPermissoesDaPessoa(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("permissoes", "editar");
  const pessoaId = valor(dados, "pessoa", 40);
  if (!UUID.test(pessoaId)) return { erro: "Escolha uma pessoa." };
  for (const area of AREAS) {
    const p = normalizarPermissao(
      dados.get(`${area}:ver`) === "on",
      dados.get(`${area}:editar`) === "on",
      dados.get(`${area}:excluir`) === "on",
    );
    const { error } = await supabase.rpc("set_person_permission", {
      p_person_id: pessoaId,
      p_area: area,
      p_ver: p.ver,
      p_editar: p.editar,
      p_excluir: p.excluir,
    });
    if (error) return { erro: mensagemErro(error) };
  }
  revalidatePath("/", "layout");
  return { ok: "Permissões salvas." };
}
