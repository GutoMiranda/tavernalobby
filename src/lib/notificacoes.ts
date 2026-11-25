/**
 * Notificações gerais do site (sino). Genéricas: tipo, mensagem, link, quem causou e lida.
 * Novos tipos (ex.: menção e dúvida no chat futuro) só precisam de um rótulo aqui.
 */
export const TIPOS_NOTIFICACAO: Record<string, string> = {
  loot_guardado: "Baú · depósito confirmado",
  deposito_recusado: "Baú · depósito recusado",
  pix_alterado: "Baú · dados de pagamento alterados",
  lembrete_deposito: "Baú · lembrete de depósito",
  armazem_responsavel: "Armazém · despensa",
  membro_aprovado: "Taverna · entrada aprovada",
};

export function rotuloNotificacao(tipo: string): string {
  return TIPOS_NOTIFICACAO[tipo] ?? "Aviso";
}

/** Início do mês de "hoje" (aaaa-mm-dd) no fuso de São Paulo, como instante ISO. */
export function inicioDoMes(hoje: string): string {
  return `${hoje.slice(0, 7)}-01T00:00:00-03:00`;
}

/** Só aceita links internos do site (o link vem do banco, mas não custa conferir). */
export function linkSeguro(link: string | null): string {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) return "/notificacoes";
  return link;
}
