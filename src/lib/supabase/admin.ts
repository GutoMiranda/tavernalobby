import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";

/**
 * Cliente com a chave secreta (service role): ignora o RLS. Só no servidor e só para tarefas
 * que o usuário não pode fazer direto (ex.: guardar tempos de viagem calculados pelo servidor).
 * Retorna null se a chave não estiver configurada.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;
  const { url } = supabaseEnv();
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
