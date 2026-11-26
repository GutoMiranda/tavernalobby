"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/** Cliente do Supabase no navegador (login, tempo real). Usa só a chave pública. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
