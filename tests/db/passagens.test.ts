// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let eventoId: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });

const registrar = async (u: string, preco = 25000, link: string | null = null) => {
  const p = await b.pessoaDe(u);
  return b.como<{ id: string }>(
    u,
    "insert into public.ticket_prices (event_id, household_id, mode, origin, destination, price_cents, link, created_by) values ($1, $2, 'onibus', 'Campinas', 'Paraty', $3, $4, $5) returning id",
    [eventoId, p.household_id, preco, link, p.id],
  );
};

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  for (const u of [bia, caio])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  [{ id: eventoId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name) values ('Páscoa') returning id",
  );
});

describe("Preços de passagens", () => {
  it("membro registra preço do próprio núcleo e todos veem", async () => {
    await registrar(bia, 25000, "https://www.clickbus.com.br/");
    const vistos = await b.como<{ price_cents: number }>(caio, "select price_cents from public.ticket_prices");
    expect(vistos).toEqual([{ price_cents: 25000 }]);
  });

  it("não registra em nome de outro núcleo nem com link que não seja https", async () => {
    const bp = await b.pessoaDe(bia);
    const cp = await b.pessoaDe(caio);
    await negado(
      b.como(
        caio,
        "insert into public.ticket_prices (event_id, household_id, mode, origin, destination, price_cents, created_by) values ($1, $2, 'aviao', 'A', 'B', 100, $3)",
        [eventoId, bp.household_id, cp.id],
      ),
    );
    await expect(registrar(caio, 100, "javascript:alert(1)")).rejects.toThrow();
  });

  it("só quem registrou (ou quem pode excluir em Aventuras) remove", async () => {
    const [{ id }] = await registrar(bia, 30000);
    await b.como(caio, "delete from public.ticket_prices where id = $1", [id]);
    expect(await b.admin("select 1 from public.ticket_prices where id = $1", [id])).toHaveLength(1);
    await b.como(bia, "delete from public.ticket_prices where id = $1", [id]);
    expect(await b.admin("select 1 from public.ticket_prices where id = $1", [id])).toHaveLength(0);
    const [{ id: outro }] = await registrar(bia, 31000);
    await b.como(admin, "delete from public.ticket_prices where id = $1", [outro]);
    expect(await b.admin("select 1 from public.ticket_prices where id = $1", [outro])).toHaveLength(0);
  });

  it("ninguém altera um preço já registrado (apaga e registra de novo)", async () => {
    const [{ id }] = await registrar(caio, 40000);
    await negado(b.como(caio, "update public.ticket_prices set price_cents = 1 where id = $1", [id]));
  });
});
