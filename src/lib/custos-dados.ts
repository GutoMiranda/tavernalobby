import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { Evento } from "./aventura-dados";
import { type Categoria, type Elegibilidade, type ItemRateio, type PessoaRateio, ratearTudo } from "./finance/rateio";
import { diasDoPeriodo } from "./format";

export type PessoaGrupo = {
  id: string;
  name: string;
  household_id: string;
  is_child: boolean;
  is_admin: boolean;
  relationship: string | null;
};
export type Presenca = {
  person_id: string;
  status: "pendente" | "vai" | "nao_vai";
  days: number | null;
  alcohol_opt_in: boolean;
  updated_by: string | null;
  updated_at: string;
};
export type ItemCusto = {
  id: string;
  category: Categoria;
  description: string;
  amount_cents: number;
  eligibility: Elegibilidade;
  proportional_to_days: boolean;
  updated_by: string | null;
};
export type Peso = {
  cost_item_id: string;
  person_id: string;
  weight: number;
  updated_by: string | null;
  updated_at: string;
};
export type Adesao = { cost_item_id: string; person_id: string };

/** Pessoas, presenças, itens de custo e o rateio de uma aventura. Cacheado por requisição. */
export const carregarCustos = cache(async (supabase: SupabaseClient, evento: Evento) => {
  const [pessoasR, presencasR, itensR] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, household_id, is_child, is_admin, relationship")
      .eq("status", "approved")
      .order("name")
      .returns<PessoaGrupo[]>(),
    supabase
      .from("attendances")
      .select("person_id, status, days, alcohol_opt_in, updated_by, updated_at")
      .eq("event_id", evento.id)
      .returns<Presenca[]>(),
    supabase
      .from("cost_items")
      .select("id, category, description, amount_cents, eligibility, proportional_to_days, updated_by")
      .eq("event_id", evento.id)
      .order("created_at")
      .returns<ItemCusto[]>(),
  ]);
  const itens = itensR.data ?? [];
  const ids = itens.map((i) => i.id);
  const [pesosR, adesoesR] = ids.length
    ? await Promise.all([
        supabase
          .from("cost_weights")
          .select("cost_item_id, person_id, weight, updated_by, updated_at")
          .in("cost_item_id", ids)
          .returns<Peso[]>(),
        supabase.from("cost_item_optins").select("cost_item_id, person_id").in("cost_item_id", ids).returns<Adesao[]>(),
      ])
    : [{ data: [] as Peso[] }, { data: [] as Adesao[] }];

  const pessoas = pessoasR.data ?? [];
  const presencas = new Map((presencasR.data ?? []).map((p) => [p.person_id, p]));
  const pesos = pesosR.data ?? [];
  const adesoes = adesoesR.data ?? [];
  const totalDias = evento.start_date && evento.end_date ? diasDoPeriodo(evento.start_date, evento.end_date) : null;

  const pessoasRateio: PessoaRateio[] = pessoas.map((p) => {
    const pr = presencas.get(p.id);
    return {
      id: p.id,
      nome: p.name,
      nucleoId: p.household_id,
      crianca: p.is_child,
      vai: pr?.status === "vai",
      dias: pr?.days ?? null,
      alcool: pr?.alcohol_opt_in ?? false,
    };
  });
  const itensRateio: ItemRateio[] = itens.map((i) => ({
    id: i.id,
    categoria: i.category,
    descricao: i.description,
    valorCentavos: i.amount_cents,
    elegibilidade: i.eligibility,
    proporcionalDias: i.proportional_to_days,
    adesoes: adesoes.filter((a) => a.cost_item_id === i.id).map((a) => a.person_id),
    pesos: Object.fromEntries(pesos.filter((w) => w.cost_item_id === i.id).map((w) => [w.person_id, Number(w.weight)])),
  }));
  const admin = pessoas.find((p) => p.is_admin) ?? null;
  const rateio = ratearTudo(itensRateio, pessoasRateio, totalDias ?? 1, {
    pessoaId: admin?.id ?? null,
    nucleoId: admin?.household_id ?? null,
  });

  return { pessoas, pessoasRateio, presencas, itens, itensRateio, pesos, adesoes, totalDias, rateio };
});
