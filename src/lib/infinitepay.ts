import "server-only";

import {
  type AvisoInfinitePay,
  type ConferenciaInfinitePay,
  deveConfirmar,
  normalizarHandle,
} from "@/lib/finance/infinitepay";
import { createAdminClient } from "@/lib/supabase/admin";

const API = "https://api.checkout.infinitepay.io";

/** InfiniteTag do dono da conta que recebe o dinheiro (INFINITEPAY_HANDLE no .env.local). */
export function handleInfinitePay(): string | null {
  return normalizarHandle(process.env.INFINITEPAY_HANDLE);
}

async function post(caminho: string, corpo: unknown): Promise<unknown> {
  const r = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(corpo),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await r.json().catch(() => null)) as unknown;
  if (!r.ok) {
    console.error("[infinitepay]", caminho, r.status, JSON.stringify(json)?.slice(0, 300));
    throw new Error(`InfinitePay respondeu ${r.status}`);
  }
  return json;
}

export async function criarLink(p: {
  handle: string;
  pedido: string;
  valorCentavos: number;
  descricao: string;
  retorno: string;
  aviso: string | null;
  cliente?: { name?: string; email?: string };
}): Promise<string> {
  const json = (await post("/links", {
    handle: p.handle,
    order_nsu: p.pedido,
    items: [{ quantity: 1, price: p.valorCentavos, description: p.descricao }],
    redirect_url: p.retorno,
    ...(p.aviso ? { webhook_url: p.aviso } : {}),
    ...(p.cliente ? { customer: p.cliente } : {}),
  })) as { url?: unknown } | null;
  const url = typeof json?.url === "string" ? json.url : "";
  if (!url.startsWith("https://")) throw new Error("InfinitePay não devolveu o link");
  return url;
}

export async function conferirPagamento(p: {
  handle: string;
  pedido: string;
  transactionNsu: string;
  slug: string;
}): Promise<ConferenciaInfinitePay> {
  return ((await post("/payment_check", {
    handle: p.handle,
    order_nsu: p.pedido,
    transaction_nsu: p.transactionNsu,
    slug: p.slug,
  })) ?? {}) as ConferenciaInfinitePay;
}

export type ResultadoCobranca = { situacao: "pago" | "pendente" | "invalido"; eventId: string | null };

/**
 * Confere na InfinitePay e credita a cobrança no baú (idempotente).
 * Usado pelo aviso automático (webhook) e pelo retorno do pagamento.
 */
export async function confirmarCobranca(aviso: AvisoInfinitePay): Promise<ResultadoCobranca> {
  const admin = createAdminClient();
  const handle = handleInfinitePay();
  if (!admin || !handle) return { situacao: "invalido", eventId: null };

  const { data: c } = await admin
    .from("pix_checkouts")
    .select("id, amount_cents, status, funds(event_id)")
    .eq("id", aviso.orderNsu)
    .maybeSingle();
  if (!c) return { situacao: "invalido", eventId: null };
  const fundo = c.funds as unknown as { event_id: string } | null;
  const eventId = fundo?.event_id ?? null;
  if (c.status === "pago") return { situacao: "pago", eventId };

  const conferencia = await conferirPagamento({
    handle,
    pedido: c.id,
    transactionNsu: aviso.transactionNsu,
    slug: aviso.slug,
  });
  if (!deveConfirmar(conferencia, c.amount_cents)) {
    console.warn("[infinitepay] pagamento não confirmado", c.id, JSON.stringify(conferencia).slice(0, 200));
    return { situacao: "pendente", eventId };
  }

  const { error } = await admin.rpc("confirm_pix_checkout", {
    p_checkout_id: c.id,
    p_paid_amount_cents: typeof conferencia.paid_amount === "number" ? conferencia.paid_amount : c.amount_cents,
    p_invoice_slug: aviso.slug,
    p_transaction_nsu: aviso.transactionNsu,
    p_capture_method: conferencia.capture_method ?? aviso.captureMethod,
    p_receipt_url: aviso.receiptUrl,
  });
  if (error) throw new Error(`Falha ao creditar cobrança: ${error.message}`);
  return { situacao: "pago", eventId };
}
