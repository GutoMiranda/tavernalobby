import { type NextRequest, NextResponse } from "next/server";

import { getSessao } from "@/lib/auth";
import { transporteNaHora } from "@/lib/rotas";

function coordenada(valor: string | null): { lat: number; lng: number } | null {
  const [lat, lng] = (valor ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Linhas de ônibus/metrô e horários na hora da consulta (ou para a saída escolhida), sem cache.
 * GET ?o=lat,lng&d=lat,lng&saida=ISO
 */
export async function GET(req: NextRequest) {
  const sessao = await getSessao().catch(() => null);
  if (!sessao?.pessoa || sessao.pessoa.status !== "approved") {
    return NextResponse.json({ erro: "Entre para ver a rota." }, { status: 401 });
  }
  const p = req.nextUrl.searchParams;
  const o = coordenada(p.get("o"));
  const d = coordenada(p.get("d"));
  if (!o || !d) return NextResponse.json({ erro: "Origem ou destino inválido." }, { status: 400 });
  const saidaTexto = p.get("saida");
  const saida = saidaTexto ? new Date(saidaTexto) : undefined;
  if (saida && Number.isNaN(saida.getTime())) {
    return NextResponse.json({ erro: "Horário de saída inválido." }, { status: 400 });
  }
  const rota = await transporteNaHora(o, d, saida);
  return NextResponse.json(rota, { headers: { "Cache-Control": "private, no-store" } });
}
