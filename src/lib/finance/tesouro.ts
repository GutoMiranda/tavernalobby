/**
 * Regras puras dos efeitos do baú (fase 2 do rebranding): tamanho da pilha de ouro
 * e quando um depósito confirmado deve soltar a explosão de moedas.
 */

/** Linhas da pilha (a de baixo tem LINHAS moedas, a de cima 1): 8+7+…+1 = 36 moedas no máximo. */
export const LINHAS_DA_PILHA = 8;
export const MOEDAS_MAXIMAS = (LINHAS_DA_PILHA * (LINHAS_DA_PILHA + 1)) / 2;

/** Quantas moedas desenhar para um progresso da meta (0 a 100%). Qualquer depósito mostra ao menos 1. */
export function moedasDaPilha(progresso: number): number {
  if (!Number.isFinite(progresso) || progresso <= 0) return 0;
  const p = Math.min(100, progresso);
  return Math.max(1, Math.round((p / 100) * MOEDAS_MAXIMAS));
}

/** Posição (linha a partir de baixo, coluna) de cada moeda, enchendo de baixo para cima. */
export function posicoesDaPilha(quantidade: number): { linha: number; coluna: number }[] {
  const posicoes: { linha: number; coluna: number }[] = [];
  for (let linha = 0; linha < LINHAS_DA_PILHA && posicoes.length < quantidade; linha++) {
    const naLinha = LINHAS_DA_PILHA - linha;
    for (let coluna = 0; coluna < naLinha && posicoes.length < quantidade; coluna++) {
      posicoes.push({ linha, coluna });
    }
  }
  return posicoes;
}

export type LinhaDoBau = { id: string; kind: string; status: string; amount_cents: number };

/**
 * Um aviso do tempo real é um depósito recém-confirmado quando é uma entrada confirmada
 * que esta tela ainda não conhecia como confirmada (vale para Pix automático e para a conferência do Tesoureiro).
 */
export function ehDepositoNovo(
  linha: Partial<LinhaDoBau> | null | undefined,
  confirmados: ReadonlySet<string>,
): boolean {
  if (!linha?.id || linha.kind !== "entrada" || linha.status !== "confirmado") return false;
  return !confirmados.has(linha.id);
}

/** A meta foi alcançada agora (antes estava abaixo de 100% e passou a 100%). */
export function metaAlcancadaAgora(antes: number, agora: number): boolean {
  return antes < 100 && agora >= 100;
}
