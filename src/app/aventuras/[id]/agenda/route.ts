import { type NextRequest, NextResponse } from "next/server";

import { arquivoIcs, proximoDeposito } from "@/lib/agenda";
import { exigirMembro } from "@/lib/auth";
import { formatarCentavos, hojeEmSaoPaulo } from "@/lib/format";

/** Arquivo .ics da aventura (?tipo=aventura) ou do depósito mensal do plano do núcleo (?tipo=deposito). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Aventura não encontrada.", { status: 404 });
  const { supabase, pessoa } = await exigirMembro();
  const { data: evento } = await supabase
    .from("events")
    .select("id, name, start_date, end_date, region, meeting_address, chosen_accommodation_id")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      name: string;
      start_date: string | null;
      end_date: string | null;
      region: string | null;
      meeting_address: string | null;
      chosen_accommodation_id: string | null;
    }>();
  if (!evento) return new NextResponse("Aventura não encontrada.", { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const link = `${site}/aventuras/${id}`;
  let ics: string;

  if (request.nextUrl.searchParams.get("tipo") === "deposito") {
    const { data: plano } = await supabase
      .from("deposit_plans")
      .select("amount_cents, day_of_month, funds!inner(event_id)")
      .eq("household_id", pessoa.household_id)
      .eq("funds.event_id", id)
      .maybeSingle<{ amount_cents: number; day_of_month: number }>();
    if (!plano) return new NextResponse("Seu núcleo não tem plano de depósitos nesta aventura.", { status: 404 });
    const inicio = proximoDeposito(hojeEmSaoPaulo(), plano.day_of_month);
    ics = arquivoIcs({
      uid: `deposito-${id}-${pessoa.household_id}@tavernalobby`,
      titulo: `Depósito no baú: ${evento.name} (${formatarCentavos(plano.amount_cents)})`,
      inicio,
      fim: inicio,
      mensal: { ate: evento.start_date },
      descricao: `Depósito do mês do seu núcleo. Registre no Baú: ${link}/bau`,
      lembreteDiasAntes: 0,
    });
  } else {
    if (!evento.start_date || !evento.end_date) {
      return new NextResponse("A aventura ainda não tem data definida.", { status: 404 });
    }
    let local = evento.meeting_address ?? evento.region;
    if (evento.chosen_accommodation_id) {
      const { data: est } = await supabase
        .from("accommodations")
        .select("name, address")
        .eq("id", evento.chosen_accommodation_id)
        .maybeSingle<{ name: string; address: string | null }>();
      if (est) local = est.address ? `${est.name}, ${est.address}` : est.name;
    }
    ics = arquivoIcs({
      uid: `aventura-${id}@tavernalobby`,
      titulo: evento.name,
      inicio: evento.start_date,
      fim: evento.end_date,
      local,
      descricao: `Aventura da Taverna O Lobby: ${link}`,
      lembreteDiasAntes: 7,
    });
  }

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="taverna-${id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
