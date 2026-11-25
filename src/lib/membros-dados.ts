import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { type Papel, papelDe } from "@/lib/personagem";

/** Membro como aparece no chat, na lista de quem está online e nos nomes enfeitados. */
export type Membro = {
  id: string;
  name: string;
  avatar: string | null;
  avatar_color: string | null;
  epithet: string | null;
  papel: Papel;
};

/** Membros aprovados com login (quem pode conversar e ser mencionado), com o papel que decora o nome. */
export const carregarMembros = cache(async (supabase: SupabaseClient): Promise<Membro[]> => {
  const [{ data: pessoas }, { data: tags }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, avatar, avatar_color, epithet, is_admin")
      .eq("status", "approved")
      .not("user_id", "is", null)
      .order("name")
      .returns<(Omit<Membro, "papel"> & { is_admin: boolean })[]>(),
    supabase
      .from("person_tags")
      .select("person_id, tags(name)")
      .returns<{ person_id: string; tags: { name: string } | null }[]>(),
  ]);
  const tagsPorPessoa = new Map<string, string[]>();
  for (const t of tags ?? []) {
    if (!t.tags) continue;
    tagsPorPessoa.set(t.person_id, [...(tagsPorPessoa.get(t.person_id) ?? []), t.tags.name]);
  }
  return (pessoas ?? []).map(({ is_admin, ...p }) => ({
    ...p,
    papel: papelDe({ is_admin }, tagsPorPessoa.get(p.id) ?? []),
  }));
});
