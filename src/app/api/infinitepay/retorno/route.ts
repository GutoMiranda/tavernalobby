import { NextResponse } from "next/server";

import { lerAviso } from "@/lib/finance/infinitepay";
import { confirmarCobranca } from "@/lib/infinitepay";

/**
 * A InfinitePay manda a pessoa de volta para cá depois do pagamento. Os parâmetros da URL não
 * provam nada: conferimos na API antes de creditar e depois levamos a pessoa ao Baú.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const aviso = lerAviso(Object.fromEntries(url.searchParams));
  let destino = "/aventuras";
  let situacao = "pendente";
  console.info("[infinitepay] retorno recebido", aviso ? `pedido ${aviso.orderNsu}` : "sem dados do pagamento");
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
