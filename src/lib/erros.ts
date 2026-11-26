/** Converte erros do Supabase/Postgres em mensagens diretas para a interface. */
export function mensagemErro(erro: { message?: string; code?: string } | null | undefined): string {
  if (!erro) return "Algo deu errado. Tente de novo.";
  const { code, message = "" } = erro;
  if (code === "42501" && /row-level security|permission denied/i.test(message)) {
    return "Você não tem permissão para fazer isso.";
  }
  if (code === "23505") return "Isso já existe.";
  if (code === "23514" || code === "22P02") return "Confira os dados informados.";
  // Nossas funções do banco já levantam mensagens em português.
  if (["42501", "P0001", "P0002", "22023"].includes(code ?? "") && message) return message;
  return "Algo deu errado. Tente de novo.";
}

export type EstadoAcao = { ok?: string; erro?: string };
