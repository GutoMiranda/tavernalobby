/** Plano de economia: quanto guardar por mês para chegar à minha parte até a data da aventura. */

export type Lancamento = {
  id: string;
  kind: "entrada" | "saida" | "estorno";
  household_id: string | null;
  amount_cents: number;
  status: "pendente" | "confirmado" | "recusado";
  reverses_id: string | null;
};

/** Depósitos de um núcleo: confirmados (sem estorno) e pendentes de confirmação. */
export function depositosDoNucleo(lancamentos: Lancamento[], nucleoId: string) {
  const estornados = new Set(
    lancamentos.filter((l) => l.kind === "estorno" && l.status === "confirmado").map((l) => l.reverses_id),
  );
  const meus = lancamentos.filter((l) => l.kind === "entrada" && l.household_id === nucleoId);
  const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.amount_cents, 0);
  return {
    confirmadoCentavos: soma(meus.filter((l) => l.status === "confirmado" && !estornados.has(l.id))),
    pendenteCentavos: soma(meus.filter((l) => l.status === "pendente")),
  };
}

/**
 * Meses de depósito: do mês atual (inclusive) até o mês anterior ao da viagem (inclusive).
 * Ex.: hoje em novembro/2026 e viagem em maio/2027 → nov, dez, jan, fev, mar, abr = 6 meses.
 * Viagem no mês atual (ou data já passada) → 1 mês (o atual).
 */
export function mesesDeDeposito(hoje: string, inicio: string): string[] {
  const [ah, mh] = hoje.split("-").map(Number);
  const [ad, md] = inicio.split("-").map(Number);
  const total = Math.max(1, (ad - ah) * 12 + (md - mh));
  return Array.from({ length: total }, (_, i) => {
    const m = mh - 1 + i;
    return `${ah + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
  });
}

export type Parcela = { mes: string; centavos: number };

/**
 * Divide um valor em parcelas mensais exatas, em centavos: cada mês recebe o valor ÷ meses (para baixo)
 * e os centavos que sobram vão, um a um, para os primeiros meses. A soma das parcelas é sempre o valor.
 */
export function dividirEmParcelas(centavos: number, meses: string[]): Parcela[] {
  if (meses.length === 0) return [];
  const base = Math.floor(centavos / meses.length);
  const resto = centavos - base * meses.length;
  return meses.map((mes, i) => ({ mes, centavos: base + (i < resto ? 1 : 0) }));
}

/** Quanto falta e o plano de depósitos mensais até o mês da viagem. */
export function planoDeEconomia(parteCentavos: number, jaEnviadoCentavos: number, hoje: string, inicio: string | null) {
  const faltaCentavos = Math.max(0, parteCentavos - jaEnviadoCentavos);
  if (!inicio) return { faltaCentavos, meses: null, porMesCentavos: faltaCentavos, parcelas: [] as Parcela[] };
  const parcelas = dividirEmParcelas(faltaCentavos, mesesDeDeposito(hoje, inicio));
  return {
    faltaCentavos,
    meses: parcelas.length,
    porMesCentavos: parcelas[0]?.centavos ?? 0,
    parcelas,
  };
}

/** "2027-01" → "jan/2027". */
export function nomeDoMes(mes: string): string {
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [a, m] = mes.split("-").map(Number);
  return `${nomes[m - 1]}/${a}`;
}

export type ValoresDoDeposito = {
  /** Valor do mês: o plano combinado do núcleo ou a sugestão do plano de economia. */
  porMesCentavos: number;
  /** Quanto guardar por semana até a aventura (arredondado para cima, cobre a parte). Null sem data. */
  porSemanaCentavos: number | null;
  /** Quanto guardar por dia até a aventura (arredondado para cima). Null sem data. */
  porDiaCentavos: number | null;
};

/**
 * Valores prontos para o campo de depósito do baú (por mês, por semana, por dia).
 * Semana e dia dividem o que falta pelos dias corridos de hoje até a véspera da aventura,
 * arredondando o centavo para cima para que a soma cubra a parte.
 */
export function valoresDoDeposito(
  faltaCentavos: number,
  porMesCentavos: number,
  hoje: string,
  inicio: string | null,
): ValoresDoDeposito {
  if (!inicio || faltaCentavos <= 0) {
    return { porMesCentavos, porSemanaCentavos: null, porDiaCentavos: null };
  }
  const dias = Math.max(
    1,
    Math.round((Date.parse(`${inicio}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000),
  );
  const semanas = Math.max(1, Math.ceil(dias / 7));
  return {
    porMesCentavos,
    porSemanaCentavos: Math.ceil(faltaCentavos / semanas),
    porDiaCentavos: Math.ceil(faltaCentavos / dias),
  };
}
