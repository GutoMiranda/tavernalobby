// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let biaId: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });
const dar = (alvo: string, area: string, ver: boolean, editar: boolean, excluir: boolean) =>
  b.como(admin, "select public.set_person_permission($1, $2, $3, $4, $5)", [alvo, area, ver, editar, excluir]);

type Ev = { start_date: string | null; end_date: string | null; phase: string; chosen_date_option_id: string | null };
const evento = async (id: string) =>
  (
    await b.admin<Ev>(
      "select start_date::text, end_date::text, phase, chosen_date_option_id from public.events where id = $1",
      [id],
    )
  )[0];

async function aventuraComDataDefinida(nome: string) {
  const [{ id }] = await b.como<{ id: string }>(admin, "insert into public.events (name) values ($1) returning id", [
    nome,
  ]);
  const [{ id: data }] = await b.como<{ id: string }>(
    admin,
    "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-04-01', '2027-04-04') returning id",
    [id],
  );
  await b.como(
    admin,
    "update public.events set chosen_date_option_id = $2, start_date = '2027-04-01', end_date = '2027-04-04', phase = 'estalagens' where id = $1",
    [id, data],
  );
  return { id, data };
}

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  biaId = (await b.pessoaDe(bia)).id;
  await b.como(admin, "select public.approve_member($1, true)", [biaId]);
});

describe("Datas sempre editáveis", () => {
  it("editar a data definida atualiza o período da aventura", async () => {
    const { id, data } = await aventuraComDataDefinida("Páscoa");
    await b.como(
      admin,
      "update public.date_options set start_date = '2027-04-02', end_date = '2027-04-06' where id = $1",
      [data],
    );
    expect(await evento(id)).toMatchObject({
      start_date: "2027-04-02",
      end_date: "2027-04-06",
      chosen_date_option_id: data,
    });
  });

  it("excluir a data definida deixa a aventura sem data e volta para a votação", async () => {
    const { id, data } = await aventuraComDataDefinida("Feriado");
    await b.como(admin, "delete from public.date_options where id = $1", [data]);
    expect(await evento(id)).toEqual({ start_date: null, end_date: null, phase: "datas", chosen_date_option_id: null });
  });

  it("depois da estalagem escolhida, excluir a data não volta a fase", async () => {
    const { id, data } = await aventuraComDataDefinida("Natal");
    await b.admin("update public.events set phase = 'presenca' where id = $1", [id]);
    await b.como(admin, "delete from public.date_options where id = $1", [data]);
    expect(await evento(id)).toMatchObject({ start_date: null, phase: "presenca" });
  });

  it("membro com 'editar' em Datas edita; sem 'excluir' não apaga", async () => {
    const { id, data } = await aventuraComDataDefinida("Carnaval");
    // Sem permissão, a edição não altera nada (RLS filtra a linha).
    await b.como(bia, "update public.date_options set end_date = '2027-04-09' where id = $1", [data]);
    expect((await evento(id)).end_date).toBe("2027-04-04");
    await dar(biaId, "datas", true, true, false);
    await b.como(bia, "update public.date_options set end_date = '2027-04-09' where id = $1", [data]);
    expect((await evento(id)).end_date).toBe("2027-04-09");
    await b.como(bia, "delete from public.date_options where id = $1", [data]);
    expect((await evento(id)).chosen_date_option_id).toBe(data);
  });
});

describe("Excluir aventura", () => {
  it("exige 'excluir' em Aventuras e o nome digitado certo", async () => {
    const { id } = await aventuraComDataDefinida("Réveillon");
    await negado(b.como(bia, "select public.delete_event($1, 'Réveillon')", [id]));
    await expect(b.como(admin, "select public.delete_event($1, 'outro nome')", [id])).rejects.toMatchObject({
      code: "22023",
    });
    await b.como(admin, "select public.delete_event($1, '  réveillon ')", [id]);
    expect(await b.admin("select 1 from public.events where id = $1", [id])).toHaveLength(0);
    expect(await b.admin("select 1 from public.date_options where event_id = $1", [id])).toHaveLength(0);
  });

  it("com movimento no baú não exclui (dinheiro não se apaga)", async () => {
    const { id } = await aventuraComDataDefinida("Com baú");
    const [{ id: fundo }] = await b.como<{ id: string }>(
      admin,
      "insert into public.funds (event_id) values ($1) returning id",
      [id],
    );
    const eu = await b.pessoaDe(admin);
    await b.como(
      admin,
      "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by) values ($1, 'entrada', $2, 100, $3)",
      [fundo, eu.household_id, eu.id],
    );
    await expect(b.como(admin, "select public.delete_event($1, 'Com baú')", [id])).rejects.toMatchObject({
      code: "P0001",
    });
    expect(await b.admin("select 1 from public.events where id = $1", [id])).toHaveLength(1);
  });

  it("quem recebe 'excluir' em Aventuras pode excluir", async () => {
    const { id } = await aventuraComDataDefinida("Da Bia");
    await dar(biaId, "aventura", true, true, true);
    await b.como(bia, "select public.delete_event($1, 'Da Bia')", [id]);
    expect(await b.admin("select 1 from public.events where id = $1", [id])).toHaveLength(0);
  });
});
