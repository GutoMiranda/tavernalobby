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
  if (aviso) {
    try {
      const r = await confirmarCobranca(aviso);
      if (r.eventId) destino = `/aventuras/${r.eventId}/bau`;
      situacao = r.situacao === "pago" ? "ok" : "pendente";
    } catch (e) {
      console.error("[infinitepay] retorno", e);
    }
  }
  return NextResponse.redirect(new URL(`${destino}?pix=${situacao}`, url.origin));
}
