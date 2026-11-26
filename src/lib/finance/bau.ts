import type { Lancamento } from "./economia";

/**
 * Saldo confirmado do baú: entradas confirmadas − saídas confirmadas, considerando estornos
 * (estorno de entrada tira; estorno de saída devolve). Pendentes e recusados não contam.
 */
export function saldoDoBau(lancamentos: Lancamento[]): {
  saldoCentavos: number;
  entradasCentavos: number;
  saidasCentavos: number;
} {
  const tipo = new Map(lancamentos.map((l) => [l.id, l.kind]));
  let entradas = 0;
  let saidas = 0;
  for (const l of lancamentos) {
    if (l.status !== "confirmado") continue;
    if (l.kind === "entrada") entradas += l.amount_cents;
    else if (l.kind === "saida") saidas += l.amount_cents;
    else if (l.kind === "estorno") {
      const original = l.reverses_id ? tipo.get(l.reverses_id) : undefined;
      if (original === "entrada") entradas -= l.amount_cents;
      else if (original === "saida") saidas -= l.amount_cents;
    }
  }
  return { saldoCentavos: entradas - saidas, entradasCentavos: entradas, saidasCentavos: saidas };
}

export type PlanoDeposito = { amount_cents: number; day_of_month: number };

/**
 * Lembrete do plano de depósitos do núcleo no mês atual.
 * - "feito": já há depósito do núcleo (pendente ou confirmado) com data neste mês;
 * - "atrasado": passou do dia combinado e não há depósito;
 * - "proximo": ainda não chegou o dia; `data` é o dia combinado deste mês.
 */
export function lembreteDoPlano(
  plano: PlanoDeposito,
  depositosDoNucleo: { occurred_on: string; status: string; kind: string }[],
  hoje: string,
): { situacao: "feito" | "atrasado" | "proximo"; data: string; valorCentavos: number } {
  const mes = hoje.slice(0, 7);
  const data = `${mes}-${String(plano.day_of_month).padStart(2, "0")}`;
  const feito = depositosDoNucleo.some(
    (d) => d.kind === "entrada" && d.status !== "recusado" && d.occurred_on.slice(0, 7) === mes,
  );
  if (feito) {
    const [a, m] = mes.split("-").map(Number);
    const proximoMes = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
    return {
      situacao: "feito",
      data: `${proximoMes}-${String(plano.day_of_month).padStart(2, "0")}`,
      valorCentavos: plano.amount_cents,
    };
  }
  return { situacao: hoje >= data ? "atrasado" : "proximo", data, valorCentavos: plano.amount_cents };
}

/** Aviso destacado de troca de Pix fica visível por 7 dias. */
export function avisoPixAtivo(pixAlteradoEm: string | null, agora: Date = new Date()): boolean {
  if (!pixAlteradoEm) return false;
  return agora.getTime() - new Date(pixAlteradoEm).getTime() < 7 * 24 * 60 * 60 * 1000;
}
