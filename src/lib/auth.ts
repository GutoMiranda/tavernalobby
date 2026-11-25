import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Pessoa = {
  id: string;
  household_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  relationship: string | null;
  is_child: boolean;
  is_admin: boolean;
  status: "pending" | "approved" | "rejected";
  avatar: string | null;
  avatar_color: string | null;
  epithet: string | null;
};

export const COLUNAS_PESSOA =
  "id, household_id, user_id, name, email, relationship, is_child, is_admin, status, avatar, avatar_color, epithet";

/** Sessão atual: usuário do Supabase, pessoa ligada a ele e suas tags. Cacheada por requisição. */
export const getSessao = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pessoa } = await supabase
    .from("people")
    .select(COLUNAS_PESSOA)
    .eq("user_id", user.id)
    .maybeSingle<Pessoa>();

  let tags: string[] = [];
  if (pessoa?.status === "approved") {
    const { data } = await supabase
      .from("person_tags")
      .select("tags(name)")
      .eq("person_id", pessoa.id)
      .returns<{ tags: { name: string } | null }[]>();
    tags = (data ?? []).map((t) => t.tags?.name).filter((n): n is string => !!n);
  }

  return { supabase, user, pessoa: pessoa ?? null, tags };
});

/** Exige login e aprovação; senão manda para /entrar ou /aguardando. */
export async function exigirMembro() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.pessoa || sessao.pessoa.status !== "approved") redirect("/aguardando");
  return { ...sessao, pessoa: sessao.pessoa };
}

/** Exige o admin (Mestre da Taverna). */
export async function exigirAdmin() {
  const sessao = await exigirMembro();
  if (!sessao.pessoa.is_admin) redirect("/");
  return sessao;
}

/** Aceita só caminhos internos (evita redirecionar para outro site). */
export function caminhoSeguro(destino: string | null | undefined, padrao = "/") {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) {
    return padrao;
  }
  return destino;
}
