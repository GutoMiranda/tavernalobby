"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirMembro, getSessao } from "@/lib/auth";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";

function texto(dados: FormData, campo: string, max = 80) {
  return String(dados.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

export async function adicionarDependente(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const nome = texto(dados, "nome");
  if (!nome) return { erro: "Informe o nome." };

  const { error } = await supabase.from("people").insert({
    household_id: pessoa.household_id,
    name: nome,
    relationship: texto(dados, "parentesco", 40) || null,
    is_child: dados.get("crianca") === "on",
  });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/familia");
  return { ok: `${nome} entrou para a família.` };
}

export async function editarPessoa(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const id = texto(dados, "id", 40);
  const nome = texto(dados, "nome");
  if (!nome) return { erro: "Informe o nome." };

  const alteracoes: Record<string, unknown> = {
    name: nome,
    relationship: texto(dados, "parentesco", 40) || null,
  };
  // Só dependentes (sem login) podem ser marcados como criança.
  if (dados.has("pode_ser_crianca")) alteracoes.is_child = dados.get("crianca") === "on";

  const { error, count } = await supabase.from("people").update(alteracoes, { count: "exact" }).eq("id", id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Você não tem permissão para fazer isso." };
  revalidatePath("/familia");
  return { ok: "Salvo." };
}

export async function removerDependente(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const id = texto(dados, "id", 40);
  const { error, count } = await supabase.from("people").delete({ count: "exact" }).eq("id", id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Só dá para remover dependentes do seu núcleo." };
  revalidatePath("/familia");
  return { ok: "Removido." };
}

export async function renomearNucleo(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const nome = texto(dados, "nome");
  if (!nome) return { erro: "Informe o nome do núcleo." };
  const { error } = await supabase.from("households").update({ name: nome }).eq("id", pessoa.household_id);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/familia");
  return { ok: "Nome do núcleo salvo." };
}

export async function gerarConviteDependente(_: EstadoAcao, dados: FormData): Promise<EstadoAcao & { link?: string }> {
  const { supabase } = await exigirMembro();
  const id = texto(dados, "id", 40);
  const { data: token, error } = await supabase.rpc("create_claim_invite", { p_person_id: id });
  if (error) return { erro: mensagemErro(error) };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { ok: "Convite criado. Vale por 14 dias.", link: `${base}/familia/aceitar/${token}` };
}

export async function aceitarConvite(token: string): Promise<EstadoAcao> {
  const sessao = await getSessao();
  if (!sessao) redirect(`/entrar?depois=/familia/aceitar/${token}`);
  const { error } = await sessao.supabase.rpc("claim_dependent_profile", { p_token: token });
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function salvarOrigem(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const textoOrigem = texto(dados, "lugar_texto", 300);
  if (!textoOrigem) return { erro: "Informe a cidade de saída." };
  const latTexto = String(dados.get("lugar_lat") ?? "");
  const lngTexto = String(dados.get("lugar_lng") ?? "");
  const lat = Number(latTexto);
  const lng = Number(lngTexto);
  const temCoordenadas = latTexto !== "" && lngTexto !== "" && Number.isFinite(lat) && Number.isFinite(lng);
  const { error } = await supabase
    .from("households")
    .update({
      origin_text: textoOrigem,
      origin_lat: temCoordenadas ? lat : null,
      origin_lng: temCoordenadas ? lng : null,
      origin_place_id: texto(dados, "lugar_id", 300) || null,
    })
    .eq("id", pessoa.household_id);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/", "layout");
  return { ok: "Cidade de saída salva." };
}
