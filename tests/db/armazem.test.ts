// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let ev: string;

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  for (const u of [bia, caio])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  [{ id: ev }] = await b.como<{ id: string }>(admin, "insert into public.events (name) values ('X') returning id");
});

describe("Armazém", () => {
  let item: string;

  it("membro cria item e o banco registra o autor", async () => {
    const p = await b.pessoaDe(bia);
    [{ id: item }] = await b.como<{ id: string }>(
      bia,
      "insert into public.pantry_items (event_id, name, quantity_per_person, unit, cost_cents, created_by) values ($1, 'Carne', 0.3, 'kg', 25000, $2) returning id",
      [ev, p.id],
    );
    const [l] = await b.como<{ updated_by: string }>(caio, "select updated_by from public.pantry_items where id = $1", [
      item,
    ]);
    expect(l.updated_by).toBe(p.id);
  });

  it("escolher outra pessoa como responsável avisa essa pessoa; assumir sozinho não avisa", async () => {
    const c = await b.pessoaDe(caio);
    await b.como(bia, "update public.pantry_items set responsible_person_id = $2 where id = $1", [item, c.id]);
    const avisos = await b.como<{ kind: string; actor_person_id: string }>(
      caio,
      "select kind, actor_person_id from public.notifications where kind like 'armazem%'",
    );
    expect(avisos).toEqual([{ kind: "armazem_responsavel", actor_person_id: (await b.pessoaDe(bia)).id }]);

    const p = await b.pessoaDe(bia);
    await b.como(bia, "update public.pantry_items set responsible_person_id = $2 where id = $1", [item, p.id]);
    expect(await b.como(bia, "select 1 from public.notifications where kind like 'armazem%'")).toHaveLength(0);
  });

  it("qualquer membro marca comprado; só autor, admin ou Despensa removem", async () => {
    await b.como(caio, "update public.pantry_items set purchased = true where id = $1", [item]);
    const r = await b.como(caio, "delete from public.pantry_items where id = $1 returning id", [item]);
    expect(r).toHaveLength(0);
    const r2 = await b.como(bia, "delete from public.pantry_items where id = $1 returning id", [item]);
    expect(r2).toHaveLength(1);
  });

  it("membro não cria notificação para outra pessoa", async () => {
    const c = await b.pessoaDe(caio);
    await expect(
      b.como(bia, "insert into public.notifications (recipient_person_id, kind, message) values ($1, 'x', 'y')", [
        c.id,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("cada um marca como lidas só as próprias", async () => {
    await b.como(bia, "update public.notifications set read_at = now()");
    const naoLidas = await b.como(caio, "select 1 from public.notifications where read_at is null");
    expect(naoLidas.length).toBeGreaterThan(0);
    await b.como(caio, "update public.notifications set read_at = now() where read_at is null");
    expect(await b.como(caio, "select 1 from public.notifications where read_at is null")).toHaveLength(0);
  });

  it("o servidor (service_role) lê planos e lançamentos e cria lembretes", async () => {
    await b.db.exec("set role service_role");
    try {
      await b.db.query(
        "select d.fund_id, f.event_id, e.name from public.deposit_plans d join public.funds f on f.id = d.fund_id join public.events e on e.id = f.event_id",
      );
      await b.db.query("select occurred_on, status, kind from public.fund_transactions");
      const p = await b.db.query<{ id: string }>("select id from public.people limit 1");
      await b.db.query(
        "insert into public.notifications (recipient_person_id, kind, message, link) values ($1, 'lembrete_deposito', 'x', '/')",
        [p.rows[0].id],
      );
      await b.db.query("select count(*) from public.notifications where kind = 'lembrete_deposito'");
    } finally {
      await b.db.exec("reset role");
    }
  });
});
