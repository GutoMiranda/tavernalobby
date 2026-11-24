// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let membro: string;
let outro: string;
let fundId: string;

async function comoServidor<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await b.db.exec("set role service_role");
  try {
    return (await b.db.query<T>(sql, params)).rows;
  } finally {
    await b.db.exec("reset role");
  }
}

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  membro = await b.criarUsuario("membro@example.com", "Bia");
  outro = await b.criarUsuario("outro@example.com", "Caio");
  for (const u of [membro, outro])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  const [{ id: ev }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name) values ('X') returning id",
  );
  [{ id: fundId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.funds (event_id) values ($1) returning id",
    [ev],
  );
});

describe("Pix pela InfinitePay", () => {
  let cobranca: string;

  it("membro abre cobrança só do próprio núcleo, sempre aberta", async () => {
    const p = await b.pessoaDe(membro);
    const o = await b.pessoaDe(outro);
    [{ id: cobranca }] = await b.como<{ id: string }>(
      membro,
      "insert into public.pix_checkouts (fund_id, household_id, amount_cents, checkout_url, created_by) values ($1, $2, 15000, 'https://checkout.infinitepay.com.br/x', $3) returning id",
      [fundId, p.household_id, p.id],
    );
    await expect(
      b.como(
        membro,
        "insert into public.pix_checkouts (fund_id, household_id, amount_cents, checkout_url, created_by) values ($1, $2, 15000, 'u', $3)",
        [fundId, o.household_id, p.id],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("membro não marca como pago nem credita sozinho", async () => {
    await expect(
      b.como(membro, "update public.pix_checkouts set status = 'pago' where id = $1", [cobranca]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      b.como(membro, "select public.confirm_pix_checkout($1, 15000, 's', 't', 'pix', null)", [cobranca]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      b.como(
        membro,
        "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, external_receipt_url, created_by) values ($1, 'entrada', (select household_id from public.people where user_id = $2), 1, 'x', (select id from public.people where user_id = $2))",
        [fundId, membro],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("o servidor credita uma única vez, já confirmado, e avisa quem pagou", async () => {
    const [{ id: t1 }] = await comoServidor<{ id: string }>(
      "select public.confirm_pix_checkout($1, 15000, 'slug', 'nsu', 'pix', 'https://recibo') as id",
      [cobranca],
    );
    const [{ id: t2 }] = await comoServidor<{ id: string }>(
      "select public.confirm_pix_checkout($1, 15000, 'slug', 'nsu', 'pix', 'https://recibo') as id",
      [cobranca],
    );
    expect(t2).toBe(t1);
    const lancamentos = await b.como<{ status: string; amount_cents: number; external_receipt_url: string }>(
      membro,
      "select status, amount_cents, external_receipt_url from public.fund_transactions where fund_id = $1",
      [fundId],
    );
    expect(lancamentos).toEqual([
      { status: "confirmado", amount_cents: 15000, external_receipt_url: "https://recibo" },
    ]);
    const avisos = await b.como(membro, "select kind from public.notifications where kind = 'loot_guardado'");
    expect(avisos).toHaveLength(1);
    const [c] = await b.como<{ status: string }>(membro, "select status from public.pix_checkouts where id = $1", [
      cobranca,
    ]);
    expect(c.status).toBe("pago");
  });

  it("valor mínimo de R$ 1,00", async () => {
    const p = await b.pessoaDe(membro);
    await expect(
      b.como(
        membro,
        "insert into public.pix_checkouts (fund_id, household_id, amount_cents, checkout_url, created_by) values ($1, $2, 99, 'u', $3)",
        [fundId, p.household_id, p.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
