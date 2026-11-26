/**
 * Regras puras da integração com a InfinitePay (checkout integrado).
 * O aviso (webhook) e o retorno do pagamento não são assinados: servem só de gatilho.
 * O crédito no baú só acontece depois de conferir na API (payment_check) com `deveConfirmar`.
 */

export type AvisoInfinitePay = {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  captureMethod: string | null;
  receiptUrl: string | null;
};

export type ConferenciaInfinitePay = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  capture_method?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(v: unknown, max = 200): string | null {
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
}

function urlHttps(v: unknown): string | null {
  const t = texto(v, 500);
  if (!t) return null;
  try {
    return new URL(t).protocol === "https:" ? t : null;
  } catch {
    return null;
  }
}

/** Lê o corpo do webhook ou os parâmetros do retorno. Devolve null se faltar algo essencial. */
export function lerAviso(dados: Record<string, unknown>): AvisoInfinitePay | null {
  const orderNsu = texto(dados.order_nsu, 40);
  const transactionNsu = texto(dados.transaction_nsu);
  const slug = texto(dados.invoice_slug) ?? texto(dados.slug);
  if (!orderNsu || !UUID.test(orderNsu) || !transactionNsu || !slug) return null;
  return {
    orderNsu: orderNsu.toLowerCase(),
    transactionNsu,
    slug,
    captureMethod: texto(dados.capture_method, 40),
    receiptUrl: urlHttps(dados.receipt_url),
  };
}

/** Só credita se a InfinitePay confirmar o pagamento e o valor bater com o da cobrança. */
export function deveConfirmar(c: ConferenciaInfinitePay, valorCobradoCentavos: number): boolean {
  return c.success === true && c.paid === true && c.amount === valorCobradoCentavos;
}

/** O aviso automático (webhook) só funciona com endereço público em https (site publicado). */
export function urlDoAviso(site: string): string | null {
  try {
    const u = new URL(site);
    if (u.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(u.hostname)) return null;
    return new URL("/api/infinitepay/webhook", u).toString();
  } catch {
    return null;
  }
}

/** InfiniteTag sem o "$" do começo; só letras, números, ponto, traço e sublinhado. */
export function normalizarHandle(h: string | undefined): string | null {
  const t = (h ?? "").trim().replace(/^\$/, "");
  return /^[a-z0-9._-]{2,60}$/i.test(t) ? t : null;
}
