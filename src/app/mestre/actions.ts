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
  revalidatePath("/mestre", "layout");
  return { ok: `Tag "${nome}" criada.` };
}

export async function novoCodigoConvite(_: EstadoAcao): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("membros", "editar");
  const { error } = await supabase.rpc("regenerate_invite_code");
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/mestre", "layout");
  return { ok: "Novo link gerado. O link antigo não funciona mais." };
}

/** Salva a matriz de permissões de uma tag (campos "<area>:ver|editar|excluir"). Só o Mestre. */
export async function salvarPermissoes(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const tag = valor(dados, "tag", 40);
  if (!UUID.test(tag)) return { erro: "Tag inválida." };
  const linhas = AREAS.map((area) => {
    const p = normalizarPermissao(
      dados.get(`${area}:ver`) === "on",
      dados.get(`${area}:editar`) === "on",
      dados.get(`${area}:excluir`) === "on",
    );
    return { tag_id: tag, area, can_view: p.ver, can_edit: p.editar, can_delete: p.excluir, updated_by: pessoa.id };
  });
  const ativas = linhas.filter((l) => l.can_view);
  const vazias = linhas.filter((l) => !l.can_view).map((l) => l.area);
  if (ativas.length > 0) {
    const { error } = await supabase
      .from("tag_permissions")
      .upsert(ativas.map((l) => ({ ...l, updated_at: new Date().toISOString() })));
    if (error) return { erro: mensagemErro(error) };
  }
  if (vazias.length > 0) {
    const { error } = await supabase.from("tag_permissions").delete().eq("tag_id", tag).in("area", vazias);
    if (error) return { erro: mensagemErro(error) };
  }
  revalidatePath("/", "layout");
  return { ok: "Permissões salvas." };
}

/** Apaga uma tag criada pelo Mestre (quem tinha perde as permissões dela). Tesoureiro não pode ser apagada. */
export async function apagarTag(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const tag = valor(dados, "tag", 40);
  const { data, error } = await supabase.from("tags").delete().eq("id", tag).select("id");
  if (error) return { erro: mensagemErro(error) };
  if (!data?.length) return { erro: "Essa tag não pode ser apagada." };
  revalidatePath("/", "layout");
  return { ok: "Tag apagada." };
}
