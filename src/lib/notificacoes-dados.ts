import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { lembreteDoPlano } from "./finance/bau";
import { formatarCentavos, formatarDia, hojeEmSaoPaulo } from "./format";
import { inicioDoMes } from "./notificacoes";
import { createAdminClient } from "./supabase/admin";

export type Notificacao = {
  id: string;
  kind: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function contarNaoLidas(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Lembrete do plano de depósitos no sino: quando chega o dia do mês e o núcleo ainda não
 * depositou, cria um aviso para a pessoa (um por baú por mês). Criado pelo servidor.
 */
export async function garantirLembretesDeDeposito(pessoa: { id: string; household_id: string }): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const hoje = hojeEmSaoPaulo();
  const { data: planos } = await admin
    .from("deposit_plans")
    .select("fund_id, amount_cents, day_of_month, funds(event_id, events(name, phase))")
    .eq("household_id", pessoa.household_id)
    .returns<
      {
        fund_id: string;
        amount_cents: number;
        day_of_month: number;
        funds: { event_id: string; events: { name: string; phase: string } | null } | null;
      }[]
    >();
  for (const plano of planos ?? []) {
    const evento = plano.funds?.events;
    if (!plano.funds || !evento || ["concluida", "cancelada"].includes(evento.phase)) continue;
    const { data: lancamentos } = await admin
      .from("fund_transactions")
      .select("occurred_on, status, kind")
      .eq("fund_id", plano.fund_id)
      .eq("household_id", pessoa.household_id);
    const lembrete = lembreteDoPlano(plano, lancamentos ?? [], hoje);
    if (lembrete.situacao !== "atrasado") continue;
    const link = `/aventuras/${plano.funds.event_id}/bau`;
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_person_id", pessoa.id)
      .eq("kind", "lembrete_deposito")
      .eq("link", link)
      .gte("created_at", inicioDoMes(hoje));
    if (count) continue;
    await admin.from("notifications").insert({
      recipient_person_id: pessoa.id,
      kind: "lembrete_deposito",
      message: `Hora do depósito do mês no baú de "${evento.name}": ${formatarCentavos(lembrete.valorCentavos)} (dia ${formatarDia(lembrete.data)}).`,
      link,
    });
  }
}
