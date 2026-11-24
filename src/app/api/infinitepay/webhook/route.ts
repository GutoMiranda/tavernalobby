import { NextResponse } from "next/server";

import { lerAviso } from "@/lib/finance/infinitepay";
import { confirmarCobranca } from "@/lib/infinitepay";

/**
 * Aviso automático da InfinitePay quando um Pix é pago. O aviso não é assinado, então nada é
 * creditado sem antes conferir o pagamento na API da InfinitePay (confirmarCobranca).
 */
export async function POST(req: Request) {
  const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const aviso = corpo && typeof corpo === "object" ? lerAviso(corpo) : null;
  if (!aviso) return NextResponse.json({ success: false, message: "Aviso inválido" }, { status: 400 });
  try {
    const r = await confirmarCobranca(aviso);
    if (r.situacao === "invalido") {
      return NextResponse.json({ success: false, message: "Pedido desconhecido" }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: null });
  } catch (e) {
    console.error("[infinitepay] webhook", e);
    return NextResponse.json({ success: false, message: "Erro ao processar" }, { status: 400 });
  }
}
