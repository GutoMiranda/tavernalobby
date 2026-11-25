import { NextResponse } from "next/server";

import { lerAviso } from "@/lib/finance/infinitepay";
import { aventuraDoPedido, confirmarCobranca } from "@/lib/infinitepay";

/**
 * A InfinitePay manda a pessoa de volta para cá depois do pagamento. Os parâmetros da URL não
 * provam nada: conferimos na API antes de creditar e depois levamos a pessoa ao Baú.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  const aviso = lerAviso(params);
  let destino = "/aventuras";
  let situacao = "pendente";
  // Só os nomes dos parâmetros (sem valores), para diagnosticar se a InfinitePay mudar o formato.
  console.info(
    "[infinitepay] retorno recebido",
    aviso ? `pedido ${aviso.orderNsu}` : "sem dados completos",
    `parâmetros: ${Object.keys(params).join(", ") || "nenhum"}`,
  );
  const pedido = typeof params.order_nsu === "string" ? params.order_nsu.trim().toLowerCase() : "";
  if (pedido) {
    const ev = await aventuraDoPedido(pedido).catch(() => null);
    if (ev) destino = `/aventuras/${ev}/bau`;
  }
  if (aviso) {
    try {
      // O Pix pode levar alguns segundos para aparecer como pago na consulta: tenta 3 vezes.
      let r = await confirmarCobranca(aviso);
      for (let i = 0; i < 2 && r.situacao === "pendente"; i++) {
        await new Promise((ok) => setTimeout(ok, 2000));
        r = await confirmarCobranca(aviso);
      }
      if (r.eventId) destino = `/aventuras/${r.eventId}/bau`;
      situacao = r.situacao === "pago" ? "ok" : "pendente";
    } catch (e) {
      console.error("[infinitepay] retorno", e);
    }
  }
  return NextResponse.redirect(new URL(`${destino}?pix=${situacao}`, url.origin));
}
