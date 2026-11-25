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
};

/** Unidades de compra (o preço é sempre "por" uma delas). */
export const UNIDADES_ARMAZEM = [
  { id: "un", nome: "unidade" },
  { id: "kg", nome: "quilo (kg)" },
  { id: "g", nome: "grama (g)" },
  { id: "L", nome: "litro (L)" },
  { id: "mL", nome: "mililitro (mL)" },
  { id: "pacote", nome: "pacote" },
  { id: "caixa", nome: "caixa" },
  { id: "fardo", nome: "fardo" },
  { id: "engradado", nome: "engradado" },
  { id: "garrafa", nome: "garrafa" },
  { id: "lata", nome: "lata" },
  { id: "long neck", nome: "long neck" },
  { id: "galão", nome: "galão" },
  { id: "dúzia", nome: "dúzia" },
  { id: "bandeja", nome: "bandeja" },
  { id: "peça", nome: "peça" },
  { id: "pote", nome: "pote" },
  { id: "saco", nome: "saco" },
  { id: "rolo", nome: "rolo" },
  { id: "maço", nome: "maço" },
  { id: "cartela", nome: "cartela" },
  { id: "barra", nome: "barra" },
  { id: "vidro", nome: "vidro" },
  { id: "sachê", nome: "sachê" },
  { id: "porção", nome: "porção" },
] as const;
export const IDS_UNIDADES: readonly string[] = UNIDADES_ARMAZEM.map((u) => u.id);

/** Custo do item = preço por unidade × quantidade, arredondado ao centavo (mesma conta do banco). */
export function custoDoItem(precoCentavos: number | null, quantidade: number | null): number {
  if (!precoCentavos || !quantidade) return 0;
  return Math.round((precoCentavos * Math.round(quantidade * 100)) / 100);
}

/**
 * Consumo de referência por pessoa por dia, para sugerir a quantidade quando ninguém informou.
 * Valores médios de churrasco/fim de semana em grupo; é só uma sugestão, editável por item.
 */
const REFERENCIAS: { palavras: string[]; unidade: string; porPessoaDia: number }[] = [
  {
    palavras: [
      "picanha",
      "carne",
      "costela",
      "alcatra",
      "maminha",
      "fraldinha",
      "contra",
      "cupim",
      "linguiça",
      "linguica",
      "frango",
      "coxa",
      "asa",
      "lombo",
      "pernil",
      "bisteca",
    ],
    unidade: "kg",
    porPessoaDia: 0.4,
  },
  { palavras: ["pão de alho", "pao de alho"], unidade: "un", porPessoaDia: 1 },
  { palavras: ["pão", "pao"], unidade: "un", porPessoaDia: 3 },
  { palavras: ["cerveja", "chopp", "chope"], unidade: "L", porPessoaDia: 1.5 },
  { palavras: ["cerveja"], unidade: "lata", porPessoaDia: 4 },
  { palavras: ["cerveja"], unidade: "long neck", porPessoaDia: 4 },
  { palavras: ["vinho"], unidade: "garrafa", porPessoaDia: 0.25 },
  { palavras: ["refrigerante", "refri"], unidade: "L", porPessoaDia: 0.6 },
  { palavras: ["refrigerante", "refri"], unidade: "lata", porPessoaDia: 2 },
  { palavras: ["água", "agua"], unidade: "L", porPessoaDia: 1.5 },
  { palavras: ["suco"], unidade: "L", porPessoaDia: 0.3 },
  { palavras: ["leite"], unidade: "L", porPessoaDia: 0.2 },
  { palavras: ["café", "cafe"], unidade: "g", porPessoaDia: 15 },
  { palavras: ["arroz"], unidade: "kg", porPessoaDia: 0.1 },
  { palavras: ["feijão", "feijao"], unidade: "kg", porPessoaDia: 0.08 },
  { palavras: ["farofa", "farinha"], unidade: "kg", porPessoaDia: 0.05 },
  { palavras: ["queijo", "muçarela", "mussarela"], unidade: "kg", porPessoaDia: 0.05 },
  { palavras: ["presunto", "peito de peru"], unidade: "kg", porPessoaDia: 0.04 },
  { palavras: ["ovo"], unidade: "un", porPessoaDia: 1 },
  { palavras: ["ovo"], unidade: "dúzia", porPessoaDia: 0.1 },
  { palavras: ["gelo"], unidade: "kg", porPessoaDia: 1 },
  { palavras: ["carvão", "carvao"], unidade: "kg", porPessoaDia: 0.3 },
  { palavras: ["papel higiênico", "papel higienico"], unidade: "rolo", porPessoaDia: 0.5 },
  { palavras: ["copo"], unidade: "un", porPessoaDia: 4 },
  { palavras: ["prato"], unidade: "un", porPessoaDia: 2 },
  { palavras: ["guardanapo"], unidade: "un", porPessoaDia: 5 },
];

/** Consumo de referência por pessoa por dia pelo nome e unidade do item (null se não souber). */
export function consumoDeReferencia(nome: string, unidade: string | null): number | null {
  const n = nome.toLocaleLowerCase("pt-BR");
  for (const r of REFERENCIAS) {
    if (r.unidade === unidade && r.palavras.some((p) => n.includes(p))) return r.porPessoaDia;
  }
  return null;
}

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
export function resumoDoArmazem(itens: ItemArmazem[]): { total: number; semCusto: number } {
  return { total: itens.length, semCusto: itens.filter((i) => !i.cost_cents).length };
}
