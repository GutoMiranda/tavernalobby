import type { PessoaRateio } from "./rateio";
import { diasEfetivos } from "./rateio";

/**
 * Regras puras do Armazém (despensa).
 * - Sugestão de quantidade = quantidade por pessoa por dia × Σ dias de quem consome.
 *   Comida e bebida sem álcool: todos os presentes (crianças comem). Alcoólicos: adultos com opt-in.
 * - O custo dos itens entra no rateio: alcoólicos em "Bebidas alcoólicas", o resto em "Alimentação".
 */

export type ItemArmazem = {
  quantity_per_person: number | null;
  quantity: number | null;
  is_alcoholic: boolean;
  cost_cents: number | null;
  purchased: boolean;
};

export const CATEGORIAS_ARMAZEM = [
  "Carnes",
  "Mercearia",
  "Hortifrúti",
  "Padaria e café da manhã",
  "Bebidas",
  "Descartáveis e limpeza",
  "Outros",
] as const;

/** Pessoas-dia de quem consome o item (presentes; alcoólicos só adultos com opt-in). */
export function pessoasDia(pessoas: PessoaRateio[], alcoolico: boolean, totalDias: number): number {
  return pessoas
    .filter((p) => p.vai && (!alcoolico || (!p.crianca && p.alcool)))
    .reduce((s, p) => s + diasEfetivos(p.dias, totalDias), 0);
}

/** Quantidade sugerida, arredondada para cima em 1 casa decimal. null sem quantidade por pessoa. */
export function quantidadeSugerida(porPessoaDia: number | null, pessoasDiaTotal: number): number | null {
  if (porPessoaDia == null || !(porPessoaDia > 0)) return null;
  // Em centésimos inteiros (o banco guarda 2 casas), sem erro de ponto flutuante: 0,3 × 28 = 8,4.
  const centesimos = Math.round(porPessoaDia * 100) * pessoasDiaTotal;
  return Math.ceil(centesimos / 10) / 10;
}

/** Soma dos custos do armazém por categoria de rateio, em centavos. */
export function custosDoArmazem(itens: ItemArmazem[]): { alimentacaoCentavos: number; alcoolCentavos: number } {
  let alimentacao = 0;
  let alcool = 0;
  for (const i of itens) {
    if (!i.cost_cents) continue;
    if (i.is_alcoholic) alcool += i.cost_cents;
    else alimentacao += i.cost_cents;
  }
  return { alimentacaoCentavos: alimentacao, alcoolCentavos: alcool };
}

/** Resumo para o topo da página. */
export function resumoDoArmazem(itens: ItemArmazem[]): { total: number; comprados: number; semCusto: number } {
  return {
    total: itens.length,
    comprados: itens.filter((i) => i.purchased).length,
    semCusto: itens.filter((i) => i.cost_cents == null).length,
  };
}
