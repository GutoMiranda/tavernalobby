"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin, exigirPermissao } from "@/lib/auth";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { AREAS, normalizarPermissao } from "@/lib/permissoes";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** Banir (bloqueia o acesso, mesmo com o link de convite) ou desbanir. Nada das contas é apagado. */
export async function banirMembro(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("membros", "excluir");
  const banir = dados.get("banir") === "sim";
  const { error } = await supabase.rpc("ban_member", { p_person_id: valor(dados, "id", 40), p_ban: banir });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/", "layout");
  return { ok: banir ? "Membro banido. Ele não entra mais na taverna." : "Banimento desfeito." };
}

/**
 * Exclui o cadastro: a pessoa (e a família, se ficar vazia) sai do banco e a conta de acesso
 * é apagada, então ela pode voltar só por um convite novo. Bloqueado se mexer em dinheiro.
 */
export async function excluirMembro(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirPermissao("membros", "excluir");
  if (dados.get("confirmo") !== "on") return { erro: "Marque a confirmação para excluir." };
  const admin = createAdminClient();
  if (!admin) return { erro: "Falta a chave secreta do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY)." };

  const { data: login, error } = await supabase.rpc("delete_member", { p_person_id: valor(dados, "id", 40) });
  if (error) return { erro: mensagemErro(error) };

  if (typeof login === "string" && UUID.test(login)) {
    const { data: fotos } = await admin.storage.from("avatares").list(login);
    if (fotos?.length) await admin.storage.from("avatares").remove(fotos.map((f) => `${login}/${f.name}`));
    const { error: erroConta } = await admin.auth.admin.deleteUser(login);
    if (erroConta) console.error("[membros] cadastro excluído, mas a conta de acesso ficou:", erroConta.message);
  }
  revalidatePath("/", "layout");
  return { ok: "Cadastro excluído." };
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
