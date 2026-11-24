/** Regras puras da aventura: fases, ranking de votação, contagem regressiva e pendências. */

import { diasEntre, hojeEmSaoPaulo } from "./format";

export const FASES = ["datas", "estalagens", "presenca", "preparativos", "concluida", "cancelada"] as const;
export type Fase = (typeof FASES)[number];

export const FASE_INFO: Record<Fase, { nome: string; proximoPasso: string }> = {
  datas: { nome: "Votação de datas", proximoPasso: "Curta ou descurta as datas candidatas." },
  estalagens: { nome: "Escolha da estalagem", proximoPasso: "Sugira estalagens (hospedagens) e reaja às opções." },
  presenca: { nome: "Confirmação de presença", proximoPasso: "Confirme quem do seu núcleo vai e por quantos dias." },
  preparativos: { nome: "Preparativos", proximoPasso: "Acompanhe os custos, o baú (caixinha) e o armazém (despensa)." },
  concluida: { nome: "Aventura concluída", proximoPasso: "A aventura acabou. Até a próxima!" },
  cancelada: { nome: "Aventura cancelada", proximoPasso: "Esta aventura foi cancelada." },
};

export type Reacao = { alvo_id: string; person_id: string; value: 1 | -1 };

export type Placar = { curtidas: number; descurtidas: number; saldo: number; minha: 1 | -1 | null };

/** Soma curtidas e descurtidas por item (data ou estalagem). */
export function placar(reacoes: Reacao[], alvoId: string, minhaPessoaId?: string): Placar {
  let curtidas = 0;
  let descurtidas = 0;
  let minha: 1 | -1 | null = null;
  for (const r of reacoes) {
    if (r.alvo_id !== alvoId) continue;
    if (r.value === 1) curtidas++;
    else descurtidas++;
    if (r.person_id === minhaPessoaId) minha = r.value;
  }
  return { curtidas, descurtidas, saldo: curtidas - descurtidas, minha };
}

/**
 * Ranking pelo saldo (curtidas − descurtidas). Empate: mais curtidas primeiro; depois a ordem
 * original (para datas, a mais cedo; para estalagens, a cadastrada primeiro).
 */
export function ranking<T extends { id: string }>(
  itens: T[],
  reacoes: Reacao[],
  minhaPessoaId?: string,
): (T & { placar: Placar; posicao: number })[] {
  return itens
    .map((item, ordem) => ({ item, ordem, placar: placar(reacoes, item.id, minhaPessoaId) }))
    .sort((a, b) => b.placar.saldo - a.placar.saldo || b.placar.curtidas - a.placar.curtidas || a.ordem - b.ordem)
    .map((x, i) => ({ ...x.item, placar: x.placar, posicao: i + 1 }));
}

/** Texto da contagem regressiva até a data de início ("Faltam 12 dias", "É amanhã!", "É hoje!"). */
export function contagemRegressiva(inicio: string | null, hoje: string = hojeEmSaoPaulo()): string | null {
  if (!inicio) return null;
  const dias = diasEntre(hoje, inicio);
  if (dias > 1) return `Faltam ${dias} dias`;
  if (dias === 1) return "É amanhã!";
  if (dias === 0) return "É hoje!";
  return null;
}

/**
 * Custo estimado por pessoa de uma estalagem: preço total ÷ adultos (crianças não pagam).
 * Usa os adultos confirmados se houver; senão, a estimativa de adultos do grupo. Em centavos, para cima.
 */
export function custoPorAdulto(precoTotalCentavos: number, adultos: number): number | null {
  if (adultos <= 0) return null;
  return Math.ceil(precoTotalCentavos / adultos);
}

export type Pendencia = { texto: string; href: string };

/** "Minhas pendências": o que falta a pessoa logada fazer nesta aventura. */
export function pendencias(params: {
  eventoId: string;
  fase: Fase;
  minhaPessoaId: string;
  souAdmin: boolean;
  datas: { id: string }[];
  reacoesDatas: Reacao[];
  estalagens: { id: string }[];
  reacoesEstalagens: Reacao[];
  nucleoTemOrigem: boolean;
  /** Pessoas do meu núcleo ainda sem resposta de presença (opcional). */
  presencasPendentes?: number;
  /** Depósito do mês do plano do núcleo que passou do dia combinado (texto já formatado). */
  depositoAtrasado?: string | null;
}): Pendencia[] {
  const p = params;
  const base = `/aventuras/${p.eventoId}`;
  const lista: Pendencia[] = [];
  const reagiu = (reacoes: Reacao[], id: string) =>
    reacoes.some((r) => r.alvo_id === id && r.person_id === p.minhaPessoaId);

  if (p.fase === "datas") {
    const faltam = p.datas.filter((d) => !reagiu(p.reacoesDatas, d.id)).length;
    if (faltam > 0) {
      lista.push({
        texto: `Votar em ${faltam} ${faltam === 1 ? "data candidata" : "datas candidatas"}`,
        href: `${base}/datas`,
      });
    }
    if (p.souAdmin && p.datas.length === 0)
      lista.push({ texto: "Cadastrar as datas candidatas", href: `${base}/datas` });
  }
  if (p.fase === "estalagens") {
    const faltam = p.estalagens.filter((e) => !reagiu(p.reacoesEstalagens, e.id)).length;
    if (faltam > 0) {
      lista.push({
        texto: `Reagir a ${faltam} ${faltam === 1 ? "estalagem (hospedagem)" : "estalagens (hospedagens)"}`,
        href: `${base}/estalagens`,
      });
    }
    if (p.estalagens.length === 0)
      lista.push({ texto: "Sugerir uma estalagem (hospedagem)", href: `${base}/estalagens` });
  }
  if (["presenca", "preparativos"].includes(p.fase) && (p.presencasPendentes ?? 0) > 0) {
    const n = p.presencasPendentes!;
    lista.push({
      texto: `Confirmar a presença de ${n} ${n === 1 ? "pessoa" : "pessoas"} do seu núcleo`,
      href: `${base}/presenca`,
    });
  }
  if (p.depositoAtrasado) {
    lista.push({ texto: `Fazer o depósito do mês no baú: ${p.depositoAtrasado}`, href: `${base}/bau` });
  }
  if (["datas", "estalagens", "presenca"].includes(p.fase) && !p.nucleoTemOrigem) {
    lista.push({ texto: "Informar a cidade de saída do seu núcleo", href: "/familia#origem" });
  }
  return lista;
}

export type PeriodoEfetivo = {
  inicio: string;
  fim: string;
  /** "fechada" = data definida pelo admin; "mais_votada" = prévia pela data candidata mais votada. */
  fonte: "fechada" | "mais_votada";
};

/**
 * Período usado nas contas (dias, custos, meses até a viagem, contagem regressiva).
 * Data fechada pelo admin vale sempre; sem ela, a data candidata mais votada (prévia).
 * Desempate da prévia: maior saldo, depois mais curtidas, depois a data que começa antes.
 */
export function periodoEfetivo(
  evento: { start_date: string | null; end_date: string | null },
  datas: { id: string; start_date: string; end_date: string }[],
  reacoesDatas: Reacao[],
): PeriodoEfetivo | null {
  if (evento.start_date && evento.end_date)
    return { inicio: evento.start_date, fim: evento.end_date, fonte: "fechada" };
  const ordenadas = [...datas].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const lider = ranking(ordenadas, reacoesDatas)[0];
  return lider ? { inicio: lider.start_date, fim: lider.end_date, fonte: "mais_votada" } : null;
}
