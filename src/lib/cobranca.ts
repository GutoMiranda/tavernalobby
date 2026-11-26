/** Mensagem de WhatsApp para cobrar quem ainda não respondeu a presença. Função pura, sem acesso ao banco. */
export type NucleoPendente = { nucleo: string; pessoas: string[] };

export function mensagemCobrancaPresenca(aventura: string, pendentes: NucleoPendente[], link: string): string {
  const linhas = pendentes.filter((n) => n.pessoas.length > 0).map((n) => `• ${n.nucleo}: ${n.pessoas.join(", ")}`);
  return [
    `🍺 Chamado da Taverna! Falta confirmar a presença na aventura *${aventura}*:`,
    ...linhas,
    "",
    `Responda aqui, leva 1 minuto: ${link}`,
  ].join("\n");
}

/** Link do WhatsApp que abre a conversa (ou o grupo escolhido) com o texto pronto. */
export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
