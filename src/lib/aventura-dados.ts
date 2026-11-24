import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cache } from "react";

import type { Fase, Reacao } from "./aventura";

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
  "id, name, description, region, phase, candidate_start, candidate_end, start_date, end_date, chosen_date_option_id, chosen_accommodation_id, date_vote_deadline, accommodation_vote_deadline, created_at";

/** Carrega a aventura e o que o painel, datas e estalagens precisam. Cacheado por requisição. */
export const carregarAventura = cache(async (supabase: SupabaseClient, id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: evento } = await supabase.from("events").select(COLUNAS_EVENTO).eq("id", id).maybeSingle<Evento>();
  if (!evento) notFound();

  const [datasR, estalagensR, nucleosR, pessoasR, presencasR] = await Promise.all([
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
      .select("id, name, household_id, is_child, status")
      .eq("status", "approved")
      .returns<{ id: string; name: string; household_id: string; is_child: boolean; status: string }[]>(),
    supabase
      .from("attendances")
      .select("person_id, status")
      .eq("event_id", id)
      .returns<{ person_id: string; status: string }[]>(),
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
    adultosConfirmados,
    adultosDoGrupo,
    /** Base do custo por pessoa: adultos confirmados, ou todos os adultos do grupo enquanto ninguém confirmou. */
    adultosParaEstimativa: adultosConfirmados || adultosDoGrupo,
    nomeDaPessoa: (pid: string | null) => (pid ? (nomes.get(pid) ?? "Alguém") : "Alguém"),
  };
});
