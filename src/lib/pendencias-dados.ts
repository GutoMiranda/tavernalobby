import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { type Pendencia, pendencias, type Reacao } from "@/lib/aventura";
import type { Evento } from "@/lib/aventura-dados";
import { lembreteDoPlano } from "@/lib/finance/bau";
import { formatarCentavos, hojeEmSaoPaulo } from "@/lib/format";

export type PendenciaDaTaverna = Pendencia & { aventura: string };

type Reagivel = { id: string; event_id: string; reacoes: { person_id: string; value: 1 | -1 }[] };

/**
 * "O que falta você fazer" na página inicial: as pendências de todas as aventuras em andamento,
 * com poucas consultas (todas em paralelo), em vez de carregar cada aventura inteira.
 */
export async function pendenciasDaTaverna(
  supabase: SupabaseClient,
  pessoa: { id: string; household_id: string },
  eventos: Evento[],
  podeCadastrarDatas: boolean,
): Promise<PendenciaDaTaverna[]> {
  const ativos = eventos.filter((e) => !["concluida", "cancelada"].includes(e.phase));
  if (ativos.length === 0) return [];
  const ids = ativos.map((e) => e.id);

  const [datasR, estalagensR, pessoasR, presencasR, nucleoR, planosR, lancsR] = await Promise.all([
    supabase
      .from("date_options")
      .select("id, event_id, reacoes:date_reactions(person_id, value)")
      .in("event_id", ids)
      .returns<Reagivel[]>(),
    supabase
      .from("accommodations")
      .select("id, event_id, reacoes:accommodation_reactions(person_id, value)")
      .in("event_id", ids)
      .returns<Reagivel[]>(),
    supabase
      .from("people")
      .select("id")
      .eq("household_id", pessoa.household_id)
      .eq("status", "approved")
      .returns<{ id: string }[]>(),
    supabase
      .from("attendances")
      .select("event_id, person_id, status")
      .in("event_id", ids)
      .returns<{ event_id: string; person_id: string; status: string }[]>(),
    supabase
      .from("households")
      .select("origin_text")
      .eq("id", pessoa.household_id)
      .maybeSingle<{ origin_text: string | null }>(),
    supabase
      .from("deposit_plans")
      .select("fund_id, amount_cents, day_of_month, funds(event_id)")
      .eq("household_id", pessoa.household_id)
      .returns<{ fund_id: string; amount_cents: number; day_of_month: number; funds: { event_id: string } | null }[]>(),
    supabase
      .from("fund_transactions")
      .select("fund_id, occurred_on, status, kind")
      .eq("household_id", pessoa.household_id)
      .returns<{ fund_id: string; occurred_on: string; status: string; kind: string }[]>(),
  ]);

  const hoje = hojeEmSaoPaulo();
  const doNucleo = (pessoasR.data ?? []).map((p) => p.id);
  const reacoes = (itens: Reagivel[]): Reacao[] =>
    itens.flatMap((i) => (i.reacoes ?? []).map((r) => ({ alvo_id: i.id, person_id: r.person_id, value: r.value })));

  return ativos.flatMap((evento) => {
    const datas = (datasR.data ?? []).filter((d) => d.event_id === evento.id);
    const estalagens = (estalagensR.data ?? []).filter((e) => e.event_id === evento.id);
    const respondidas = new Set(
      (presencasR.data ?? [])
        .filter((a) => a.event_id === evento.id && a.status !== "pendente")
        .map((a) => a.person_id),
    );
    const plano = (planosR.data ?? []).find((p) => p.funds?.event_id === evento.id);
    const lembrete = plano
      ? lembreteDoPlano(
          plano,
          (lancsR.data ?? []).filter((l) => l.fund_id === plano.fund_id),
          hoje,
        )
      : null;
    return pendencias({
      eventoId: evento.id,
      fase: evento.phase,
      minhaPessoaId: pessoa.id,
      podeCadastrarDatas,
      datas,
      reacoesDatas: reacoes(datas),
      estalagens,
      reacoesEstalagens: reacoes(estalagens),
      nucleoTemOrigem: !!nucleoR.data?.origin_text,
      presencasPendentes: doNucleo.filter((id) => !respondidas.has(id)).length,
      depositoAtrasado: lembrete?.situacao === "atrasado" ? formatarCentavos(lembrete.valorCentavos) : null,
    }).map((p) => ({ ...p, aventura: evento.name }));
  });
}

/** Tira repetições: o ponto de saída vale para todas as aventuras, então aparece uma vez só. */
export function semRepetir(lista: PendenciaDaTaverna[]): PendenciaDaTaverna[] {
  const vistas = new Set<string>();
  return lista.filter((p) => {
    const chave = p.href.startsWith("/familia") ? p.href : `${p.href}|${p.texto}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}
