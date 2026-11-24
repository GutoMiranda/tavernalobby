// @vitest-environment node
import { beforeAll, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let membro: string;

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  membro = await b.criarUsuario("membro@example.com", "Bia");
  await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(membro)).id]);
});

it("membros leem tempos de viagem, mas só o servidor grava", async () => {
  const p = await b.pessoaDe(membro);
  const [{ id: ev }] = await b.como<{ id: string }>(admin, "insert into public.events (name) values ('X') returning id");
  const [{ id: est }] = await b.como<{ id: string }>(
    membro,
    "insert into public.accommodations (event_id, name, total_price_cents, created_by) values ($1, 'Casa', 100000, $2) returning id",
    [ev, p.id],
  );
  await expect(
    b.como(
      membro,
      "insert into public.travel_times (household_id, accommodation_id, origin_lat, origin_lng, dest_lat, dest_lng, duration_seconds) values ($1, $2, 0, 0, 0, 0, 1)",
      [p.household_id, est],
    ),
  ).rejects.toMatchObject({ code: "42501" });

  await b.admin(
    "insert into public.travel_times (household_id, accommodation_id, origin_lat, origin_lng, dest_lat, dest_lng, duration_seconds) values ($1, $2, 0, 0, 0, 0, 3600)",
    [p.household_id, est],
  );
  expect(await b.como(membro, "select * from public.travel_times")).toHaveLength(1);
  const pendente = await b.criarUsuario("p@example.com", "P");
  expect(await b.como(pendente, "select * from public.travel_times")).toHaveLength(0);
});
