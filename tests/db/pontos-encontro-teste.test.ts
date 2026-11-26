// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let ev: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });

async function membro(email: string, nome: string) {
  const user = await b.criarUsuario(email, nome);
  const { id } = await b.pessoaDe(user);
  await b.como(admin, "select public.approve_member($1, true)", [id]);
  return { user, id };
}

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  [{ id: ev }] = await b.admin<{ id: string }>("insert into public.events (name) values ('Serra') returning id");
});

describe("Pontos de encontro", () => {
  it("todo membro cadastra; só quem cadastrou (ou quem edita a Aventura) altera e remove", async () => {
    const ana = await membro("ana@example.com", "Ana");
    const bia = await membro("bia@example.com", "Bia");
    const [p] = await b.como<{ id: string }>(
      ana.user,
      "insert into public.meeting_points (event_id, name, created_by) values ($1, 'Posto Graal', $2) returning id",
      [ev, ana.id],
    );
    expect(await b.como(bia.user, "select name from public.meeting_points where event_id = $1", [ev])).toEqual([
      { name: "Posto Graal" },
    ]);
    // Bia não altera nem apaga o ponto da Ana (a política filtra: nada muda).
    await b.como(bia.user, "update public.meeting_points set name = 'X' where id = $1", [p.id]);
    await b.como(bia.user, "delete from public.meeting_points where id = $1", [p.id]);
    expect(await b.admin("select name from public.meeting_points where id = $1", [p.id])).toEqual([
      { name: "Posto Graal" },
    ]);
    // Ninguém cadastra em nome de outra pessoa.
    await expect(
      b.como(bia.user, "insert into public.meeting_points (event_id, name, created_by) values ($1, 'Y', $2)", [
        ev,
        ana.id,
      ]),
    ).rejects.toThrow();
    // O Mestre altera e remove.
    await b.como(admin, "update public.meeting_points set name = 'Posto Graal km 60' where id = $1", [p.id]);
    await b.como(admin, "delete from public.meeting_points where id = $1", [p.id]);
    expect(await b.admin("select 1 from public.meeting_points where id = $1", [p.id])).toHaveLength(0);
  });
});

describe("Famílias de teste", () => {
  it("o Mestre cria adultos e crianças aprovados e apaga tudo, inclusive o Baú de teste", async () => {
    const [{ id: fam }] = await b.como<{ id: string }>(
      admin,
      "select public.create_test_household('Silva', 2, 1) as id",
    );
    const pessoas = await b.admin<{ name: string; is_child: boolean; status: string }>(
      "select name, is_child, status from public.people where household_id = $1 order by name",
      [fam],
    );
    expect(pessoas).toEqual([
      { name: "Adulto 1 (teste)", is_child: false, status: "approved" },
      { name: "Adulto 2 (teste)", is_child: false, status: "approved" },
      { name: "Criança 1 (teste)", is_child: true, status: "approved" },
    ]);
    expect(await b.admin("select name, is_test from public.households where id = $1", [fam])).toEqual([
      { name: "[Teste] Silva", is_test: true },
    ]);

    const [{ id: fundo }] = await b.admin<{ id: string }>(
      "insert into public.funds (event_id) values ($1) returning id",
      [ev],
    );
    const [{ id: tx }] = await b.admin<{ id: string }>(
      "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents) values ($1, 'entrada', $2, 5000) returning id",
      [fundo, fam],
    );
    await b.admin(
      "insert into public.fund_transactions (fund_id, kind, amount_cents, reverses_id) values ($1, 'estorno', 5000, $2)",
      [fundo, tx],
    );
    await b.como(admin, "select public.delete_test_household($1)", [fam]);
    expect(await b.admin("select 1 from public.households where id = $1", [fam])).toHaveLength(0);
    expect(await b.admin("select 1 from public.fund_transactions where fund_id = $1", [fundo])).toHaveLength(0);
  });

  it("não apaga família de verdade, e quem não tem permissão não cria", async () => {
    const caio = await membro("caio@example.com", "Caio");
    await negado(b.como(caio.user, "select public.create_test_household('X', 1, 0)"));
    const { household_id } = await b.pessoaDe(caio.user);
    await expect(b.como(admin, "select public.delete_test_household($1)", [household_id])).rejects.toThrow(
      /não encontrada/,
    );
  });
});
