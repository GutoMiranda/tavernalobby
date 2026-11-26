/**
 * Regras de rateio da Taverna (escopo, seção 5). Funções puras, em centavos (inteiros).
 *
 * - Só adultos presentes (status "vai") entram; crianças têm peso zero em tudo.
 * - Acomodação (ou item marcado "proporcional aos dias"): parte = valor × dias × peso ÷ Σ(dias × peso).
 * - Alimentação e extras: divisão igual (× peso), mesmo para quem vai só 1 dia.
 * - Bebidas alcoólicas: só quem marcou opt-in de álcool.
 * - Extras "opt-in": só quem aderiu ao item.
 * - Arredondamento: cada parte é arredondada ao centavo; a diferença vai para o núcleo do admin,
 *   para que a soma das partes seja exatamente o valor do item.
 */

export type Categoria = "acomodacao" | "alimentacao" | "alcool" | "extra";
export type Elegibilidade = "presentes" | "opt_in";

export type PessoaRateio = {
  id: string;
  nome: string;
  nucleoId: string;
  crianca: boolean;
  vai: boolean;
  /** Dias de permanência; null = período todo. */
  dias: number | null;
  alcool: boolean;
};

export type ItemRateio = {
  id: string;
  categoria: Categoria;
  descricao: string;
  valorCentavos: number;
  elegibilidade: Elegibilidade;
  proporcionalDias: boolean;
  /** Quem aderiu (só vale para elegibilidade "opt_in" em extras). */
  adesoes: string[];
  /** Ajuste de peso por pessoa (padrão 1). */
  pesos: Record<string, number>;
};

export type ParteRateio = {
  pessoaId: string;
  nucleoId: string;
  dias: number;
  peso: number;
  /** dias × peso (proporcional) ou peso (divisão igual). */
  base: number;
  centavos: number;
  /** Centavos somados (+) ou tirados (−) pelo arredondamento. */
  ajusteCentavos: number;
};

export type RateioItem = {
  itemId: string;
  regra: string;
  baseTotal: number;
  partes: ParteRateio[];
};

export const NOME_CATEGORIA: Record<Categoria, string> = {
  acomodacao: "Acomodação",
  alimentacao: "Alimentação e bebidas não alcoólicas",
  alcool: "Bebidas alcoólicas",
  extra: "Extra",
};

/** Dias efetivos de uma pessoa: entre 1 e o total do período (null = período todo). */
export function diasEfetivos(dias: number | null, diasDoPeriodo: number): number {
  const total = Math.max(1, diasDoPeriodo);
  if (dias == null) return total;
  return Math.min(total, Math.max(1, Math.floor(dias)));
}

/** Quem entra no rateio de um item (antes do peso). */
export function elegiveis(item: ItemRateio, pessoas: PessoaRateio[]): PessoaRateio[] {
  return pessoas.filter((p) => {
    if (p.crianca || !p.vai) return false;
    if (item.categoria === "alcool") return p.alcool;
    if (item.elegibilidade === "opt_in") return item.adesoes.includes(p.id);
    return true;
  });
}

export function descreverRegra(item: ItemRateio): string {
  const quem =
    item.categoria === "alcool"
      ? "adultos com opt-in de álcool"
      : item.elegibilidade === "opt_in"
        ? "adultos que aderiram"
        : "adultos presentes";
  return item.proporcionalDias ? `Proporcional aos dias, entre ${quem}` : `Divisão igual entre ${quem}`;
}

/**
 * Divide um item entre os elegíveis. `nucleoAdmin` recebe a diferença de centavos do arredondamento
 * (de preferência a própria pessoa admin, se ela participa).
 */
export function ratearItem(
  item: ItemRateio,
  pessoas: PessoaRateio[],
  diasDoPeriodo: number,
  admin: { pessoaId: string | null; nucleoId: string | null },
): RateioItem {
  const regra = descreverRegra(item);
  const partes: ParteRateio[] = elegiveis(item, pessoas)
    .map((p) => {
      const dias = diasEfetivos(p.dias, diasDoPeriodo);
      const peso = item.pesos[p.id] ?? 1;
      const base = item.proporcionalDias ? dias * peso : peso;
      return { pessoaId: p.id, nucleoId: p.nucleoId, dias, peso, base, centavos: 0, ajusteCentavos: 0 };
    })
    .filter((p) => p.base > 0);

  const baseTotal = partes.reduce((s, p) => s + p.base, 0);
  if (baseTotal === 0 || item.valorCentavos === 0) return { itemId: item.id, regra, baseTotal, partes };

  for (const p of partes) p.centavos = Math.round((item.valorCentavos * p.base) / baseTotal);

  const diferenca = item.valorCentavos - partes.reduce((s, p) => s + p.centavos, 0);
  if (diferenca !== 0) {
    const quem =
      partes.find((p) => p.pessoaId === admin.pessoaId) ??
      partes.find((p) => p.nucleoId === admin.nucleoId) ??
      // Núcleo do admin fora do item: a diferença vai para a maior parte (critério estável).
      [...partes].sort((a, b) => b.centavos - a.centavos || a.pessoaId.localeCompare(b.pessoaId))[0];
    quem.centavos += diferenca;
    quem.ajusteCentavos = diferenca;
  }
  return { itemId: item.id, regra, baseTotal, partes };
}

export type Resumo = {
  itens: RateioItem[];
  totalCentavos: number;
  porPessoa: Map<string, number>;
  porNucleo: Map<string, number>;
  /** Itens sem ninguém para dividir (o valor ainda não está coberto). */
  semParticipantes: string[];
};

/** Rateia todos os itens e soma por pessoa e por núcleo. */
export function ratearTudo(
  itens: ItemRateio[],
  pessoas: PessoaRateio[],
  diasDoPeriodo: number,
  admin: { pessoaId: string | null; nucleoId: string | null },
): Resumo {
  const porPessoa = new Map<string, number>();
  const porNucleo = new Map<string, number>();
  const semParticipantes: string[] = [];
  const resultado = itens.map((item) => {
    const r = ratearItem(item, pessoas, diasDoPeriodo, admin);
    if (r.partes.length === 0 && item.valorCentavos > 0) semParticipantes.push(item.id);
    for (const p of r.partes) {
      porPessoa.set(p.pessoaId, (porPessoa.get(p.pessoaId) ?? 0) + p.centavos);
      porNucleo.set(p.nucleoId, (porNucleo.get(p.nucleoId) ?? 0) + p.centavos);
    }
    return r;
  });
  return {
    itens: resultado,
    totalCentavos: itens.reduce((s, i) => s + i.valorCentavos, 0),
    porPessoa,
    porNucleo,
    semParticipantes,
  };
}
