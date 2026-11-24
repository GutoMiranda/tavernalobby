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

/** Meses (arredondando para cima, mínimo 1) entre hoje e a data, ambos "AAAA-MM-DD". */
export function mesesAte(hoje: string, data: string): number {
  const [ah, mh, dh] = hoje.split("-").map(Number);
  const [ad, md, dd] = data.split("-").map(Number);
  let meses = (ad - ah) * 12 + (md - mh);
  if (dd > dh) meses += 1; // mês parcial conta como um depósito a mais
  return Math.max(1, meses);
}

/** Quanto falta e quanto guardar por mês (arredondado para cima, em centavos). */
export function planoDeEconomia(parteCentavos: number, jaEnviadoCentavos: number, hoje: string, inicio: string | null) {
  const faltaCentavos = Math.max(0, parteCentavos - jaEnviadoCentavos);
  if (!inicio || inicio <= hoje) return { faltaCentavos, meses: null, porMesCentavos: faltaCentavos };
  const meses = mesesAte(hoje, inicio);
  return { faltaCentavos, meses, porMesCentavos: Math.ceil(faltaCentavos / meses) };
}
