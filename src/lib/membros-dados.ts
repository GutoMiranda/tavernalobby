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
  /** URL assinada (1 dia) da foto do avatar, se a pessoa enviou uma. */
  foto: string | null;
  papel: Papel;
};

/** URLs assinadas das fotos de avatar (bucket privado), numa chamada só. */
export async function urlsDasFotos(supabase: SupabaseClient, caminhos: string[]): Promise<Map<string, string>> {
  const lista = [...new Set(caminhos.filter(Boolean))];
  if (lista.length === 0) return new Map();
  const { data } = await supabase.storage.from("avatares").createSignedUrls(lista, 86_400);
  const mapa = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa.set(d.path, d.signedUrl);
  return mapa;
}

/** Membros aprovados com login (quem pode conversar e ser mencionado), com o papel que decora o nome. */
export const carregarMembros = cache(async (supabase: SupabaseClient): Promise<Membro[]> => {
  const [{ data: pessoas }, { data: tags }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, avatar, avatar_color, epithet, avatar_path, is_admin")
      .eq("status", "approved")
      .not("user_id", "is", null)
      .order("name")
      .returns<(Omit<Membro, "papel" | "foto"> & { is_admin: boolean; avatar_path: string | null })[]>(),
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
  const fotos = await urlsDasFotos(
    supabase,
    (pessoas ?? []).map((p) => p.avatar_path ?? ""),
  );
  return (pessoas ?? []).map(({ is_admin, avatar_path, ...p }) => ({
    ...p,
    foto: avatar_path ? (fotos.get(avatar_path) ?? null) : null,
    papel: papelDe({ is_admin }, tagsPorPessoa.get(p.id) ?? []),
  }));
});
