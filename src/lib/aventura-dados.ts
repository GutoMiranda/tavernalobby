import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cache } from "react";

import type { Fase, Reacao } from "./aventura";
import { saldoDoBau } from "./finance/bau";
import type { Lancamento } from "./finance/economia";

export type Evento = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  phase: Fase;
  candidate_start: string | null;
  candidate_end: string | null;
  start_date: string | null;
  end_date: string | null;
  chosen_date_option_id: string | null;
  chosen_accommodation_id: string | null;
  date_vote_deadline: string | null;
  accommodation_vote_deadline: string | null;
  meeting_name: string | null;
  meeting_address: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  meeting_at: string | null;
  meeting_notes: string | null;
  created_at: string;
};

export type OpcaoData = { id: string; start_date: string; end_date: string; note: string | null };

export type Estalagem = {
  id: string;
  name: string;
  url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  total_price_cents: number;
  capacity: number | null;
  photos: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type Nucleo = {
  id: string;
  name: string;
  origin_text: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
};

export const COLUNAS_EVENTO =
  "id, name, description, region, phase, candidate_start, candidate_end, start_date, end_date, chosen_date_option_id, chosen_accommodation_id, date_vote_deadline, accommodation_vote_deadline, meeting_name, meeting_address, meeting_lat, meeting_lng, meeting_at, meeting_notes, created_at";

export type PontoEncontro = {
  id: string;
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  meet_at: string | null;
  notes: string | null;
  created_by: string | null;
};

/** Nome curto do ponto de encontro (o nome dado, senão o endereço). */
export function nomeDoPonto(p: Pick<PontoEncontro, "name" | "address">): string {
  return p.name ?? p.address ?? "Ponto de encontro";
}

/** Carrega a aventura e o que o painel, datas e estalagens precisam. Cacheado por requisição. */
export const carregarAventura = cache(async (supabase: SupabaseClient, id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: evento } = await supabase.from("events").select(COLUNAS_EVENTO).eq("id", id).maybeSingle<Evento>();
  if (!evento) notFound();

  const [datasR, estalagensR, nucleosR, pessoasR, presencasR, pontosR] = await Promise.all([
    supabase
      .from("date_options")
      .select("id, start_date, end_date, note, date_reactions(person_id, value)")
      .eq("event_id", id)
      .order("start_date")
      .returns<(OpcaoData & { date_reactions: { person_id: string; value: 1 | -1 }[] })[]>(),
    supabase
      .from("accommodations")
      .select(
        "id, name, url, address, lat, lng, total_price_cents, capacity, photos, notes, created_by, created_at, accommodation_reactions(person_id, value)",
      )
      .eq("event_id", id)
      .order("created_at")
      .returns<(Estalagem & { accommodation_reactions: { person_id: string; value: 1 | -1 }[] })[]>(),
    supabase.from("households").select("id, name, origin_text, origin_lat, origin_lng").returns<Nucleo[]>(),
    supabase
      .from("people")
      .select("id, name, household_id, is_child, status, user_id")
      .eq("status", "approved")
      .returns<
        { id: string; name: string; household_id: string; is_child: boolean; status: string; user_id: string | null }[]
      >(),
    supabase
      .from("attendances")
      .select("person_id, status")
      .eq("event_id", id)
      .returns<{ person_id: string; status: string }[]>(),
    supabase
      .from("meeting_points")
      .select("id, name, address, lat, lng, place_id, meet_at, notes, created_by")
      .eq("event_id", id)
      .order("created_at")
      .returns<PontoEncontro[]>(),
  ]);

  const datas = (datasR.data ?? []).map(({ date_reactions: _r, ...d }) => d);
  const reacoesDatas: Reacao[] = (datasR.data ?? []).flatMap((d) =>
    d.date_reactions.map((r) => ({ alvo_id: d.id, person_id: r.person_id, value: r.value })),
  );
  const estalagens = (estalagensR.data ?? []).map(({ accommodation_reactions: _r, ...e }) => e);
  const reacoesEstalagens: Reacao[] = (estalagensR.data ?? []).flatMap((e) =>
    e.accommodation_reactions.map((r) => ({ alvo_id: e.id, person_id: r.person_id, value: r.value })),
  );

  const pessoas = pessoasR.data ?? [];
  const confirmados = new Set((presencasR.data ?? []).filter((p) => p.status === "vai").map((p) => p.person_id));
  const adultosConfirmados = pessoas.filter((p) => !p.is_child && confirmados.has(p.id)).length;
  const adultosDoGrupo = pessoas.filter((p) => !p.is_child).length;
  const nomes = new Map(pessoas.map((p) => [p.id, p.name]));

  return {
    evento,
    datas,
    reacoesDatas,
    estalagens,
    reacoesEstalagens,
    nucleos: nucleosR.data ?? [],
    /** Pontos de encontro, na ordem em que foram cadastrados. */
    pontos: pontosR.data ?? [],
    /** Membros com login (usuários), para listas por pessoa. */
    usuarios: pessoas.filter((p) => p.user_id),
    adultosConfirmados,
    adultosDoGrupo,
    /** Base do custo por pessoa: adultos confirmados, ou todos os adultos do grupo enquanto ninguém confirmou. */
    adultosParaEstimativa: adultosConfirmados || adultosDoGrupo,
    nomeDaPessoa: (pid: string | null) => (pid ? (nomes.get(pid) ?? "Alguém") : "Alguém"),
  };
});

export type ResumoDaCarta = { confirmados: number; bauCentavos: number | null; estalagem: string | null };

/** Números da carta de cada aventura (quadro de missões): confirmados, saldo do baú e estalagem escolhida. */
export async function resumoDasAventuras(
  supabase: SupabaseClient,
  eventos: Evento[],
): Promise<Map<string, ResumoDaCarta>> {
  const ids = eventos.map((e) => e.id);
  const resumo = new Map<string, ResumoDaCarta>(
    ids.map((id) => [id, { confirmados: 0, bauCentavos: null, estalagem: null }]),
  );
  if (ids.length === 0) return resumo;
  const escolhidas = eventos.map((e) => e.chosen_accommodation_id).filter((x): x is string => !!x);
  const [presencas, fundos, estalagens] = await Promise.all([
    supabase
      .from("attendances")
      .select("event_id")
      .in("event_id", ids)
      .eq("status", "vai")
      .returns<{ event_id: string }[]>(),
    supabase.from("funds").select("id, event_id").in("event_id", ids).returns<{ id: string; event_id: string }[]>(),
    escolhidas.length
      ? supabase
          .from("accommodations")
          .select("id, name")
          .in("id", escolhidas)
          .returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  for (const p of presencas.data ?? []) resumo.get(p.event_id)!.confirmados += 1;
  const nomeEstalagem = new Map((estalagens.data ?? []).map((a) => [a.id, a.name]));
  for (const e of eventos)
    if (e.chosen_accommodation_id) resumo.get(e.id)!.estalagem = nomeEstalagem.get(e.chosen_accommodation_id) ?? null;
  const fundoDoEvento = new Map((fundos.data ?? []).map((f) => [f.id, f.event_id]));
  if (fundoDoEvento.size) {
    const { data: lancs } = await supabase
      .from("fund_transactions")
      .select("id, fund_id, kind, household_id, amount_cents, status, reverses_id")
      .in("fund_id", [...fundoDoEvento.keys()])
      .returns<(Lancamento & { fund_id: string })[]>();
    for (const [fundo, evento] of fundoDoEvento)
      resumo.get(evento)!.bauCentavos = saldoDoBau((lancs ?? []).filter((l) => l.fund_id === fundo)).saldoCentavos;
  }
  return resumo;
}
