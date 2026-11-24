import { describe, expect, it } from "vitest";

import { deveConfirmar, lerAviso, normalizarHandle, urlDoAviso } from "./infinitepay";

const ID = "3f1c2b9e-1d2c-4f5a-9b8c-7d6e5f4a3b2c";

describe("lerAviso", () => {
  it("lê o corpo do webhook", () => {
    expect(
      lerAviso({
        invoice_slug: "abc",
        amount: 15000,
        paid_amount: 15000,
        capture_method: "pix",
        transaction_nsu: "nsu-1",
        order_nsu: ID.toUpperCase(),
        receipt_url: "https://recibo.infinitepay.io/x",
      }),
    ).toEqual({
      orderNsu: ID,
      transactionNsu: "nsu-1",
      slug: "abc",
      captureMethod: "pix",
      receiptUrl: "https://recibo.infinitepay.io/x",
    });
  });

  it("lê os parâmetros do retorno (slug em vez de invoice_slug)", () => {
    expect(lerAviso({ slug: "s", transaction_nsu: 123, order_nsu: ID })?.slug).toBe("s");
  });

  it("recusa aviso incompleto ou com pedido inválido", () => {
    expect(lerAviso({ order_nsu: ID, transaction_nsu: "x" })).toBeNull();
    expect(lerAviso({ order_nsu: "1; drop", transaction_nsu: "x", slug: "s" })).toBeNull();
    expect(lerAviso({})).toBeNull();
  });

  it("ignora recibo que não é https", () => {
    expect(
      lerAviso({ order_nsu: ID, transaction_nsu: "x", slug: "s", receipt_url: "javascript:alert(1)" })?.receiptUrl,
    ).toBeNull();
  });
});

describe("deveConfirmar", () => {
  it("credita só com pagamento confirmado e valor exato", () => {
    expect(deveConfirmar({ success: true, paid: true, amount: 15000 }, 15000)).toBe(true);
    expect(deveConfirmar({ success: true, paid: false, amount: 15000 }, 15000)).toBe(false);
    expect(deveConfirmar({ success: false, paid: true, amount: 15000 }, 15000)).toBe(false);
    expect(deveConfirmar({ success: true, paid: true, amount: 14999 }, 15000)).toBe(false);
    expect(deveConfirmar({}, 15000)).toBe(false);
  });
});

describe("urlDoAviso", () => {
  it("só monta o aviso para site público em https", () => {
    expect(urlDoAviso("https://taverna.vercel.app")).toBe("https://taverna.vercel.app/api/infinitepay/webhook");
    expect(urlDoAviso("http://localhost:3000")).toBeNull();
    expect(urlDoAviso("")).toBeNull();
  });
});

describe("normalizarHandle", () => {
  it("tira o $ e valida", () => {
    expect(normalizarHandle("$taverna_lobby")).toBe("taverna_lobby");
    expect(normalizarHandle("  gus.m ")).toBe("gus.m");
    expect(normalizarHandle("")).toBeNull();
    expect(normalizarHandle(undefined)).toBeNull();
    expect(normalizarHandle("a b")).toBeNull();
  });
});
