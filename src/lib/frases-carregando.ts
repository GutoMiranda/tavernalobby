/** Frases de sátira de RPG mostradas enquanto uma página carrega (pedido do dono em 26/11/2026). */
export const FRASES_CARREGANDO = [
  "Rolando iniciativa…",
  "O Mestre está procurando as fichas embaixo do sofá…",
  "Convencendo o bardo a não seduzir o dragão…",
  "Tirei 1 natural na conexão. Rolando de novo…",
  "O ladino está desarmando a armadilha da página…",
  "Contando moedas de cobre no baú…",
  "O mago esqueceu o teleporte. Indo a pé…",
  "Consultando o livro de regras, página 347…",
  "O paladino está discutindo alinhamento com o taverneiro…",
  "Esperando o clérigo terminar o lanche…",
  "Teste de Percepção para achar a aventura…",
  "O guerreiro abriu a porta com a cabeça. Quase lá…",
  "Desenhando o mapa em papel quadriculado…",
  "Rolando 3d6 para ver quanto falta…",
  "O druida virou urso e não quer voltar…",
  "Negociando o preço da estalagem com o taverneiro…",
  "Alguém perguntou se dá para fazer um teste de Carisma com o loading…",
  "Afiando as espadas e os boletos…",
] as const;

/** Índice da próxima frase, sem repetir a atual. `sorteio` em [0, 1). */
export function proximaFrase(atual: number, sorteio: number, total: number = FRASES_CARREGANDO.length): number {
  if (total <= 1) return 0;
  const passo = 1 + Math.floor(sorteio * (total - 1));
  return (atual + passo) % total;
}
