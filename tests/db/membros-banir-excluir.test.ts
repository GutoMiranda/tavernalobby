// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let adminId: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });
const status = async (id: string) =>
  (await b.admin<{ status: string }>("select status from public.people where id = $1", [id]))[0]?.status;

async function membroAprovado(email: string, nome: string) {
  const user = await b.criarUsuario(email, nome);
  const { id, household_id } = await b.pessoaDe(user);
  await b.como(admin, "select public.approve_member($1, true)", [id]);
  return { user, id, household: household_id as string };
}

async function aventura(nome: string) {
  const [{ id }] = await b.admin<{ id: string }>("insert into public.events (name) values ($1) returning id", [nome]);
  return id;
}

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  adminId = (await b.pessoaDe(admin)).id;
});

describe("Banir membro", () => {
  it("o Mestre bane: perde o acesso, e aprovar não desfaz; desbanir devolve", async () => {
    const m = await membroAprovado("caio@example.com", "Caio");
    await b.como(admin, "select public.ban_member($1, true)", [m.id]);
    expect(await status(m.id)).toBe("banned");
    expect(await b.como(m.user, "select public.is_approved() as ok")).toEqual([{ ok: false }]);
    await expect(b.como(admin, "select public.approve_member($1, true)", [m.id])).rejects.toThrow(/banido/);

    await b.como(admin, "select public.ban_member($1, false)", [m.id]);
    expect(await status(m.id)).toBe("approved");
  });

  it("ninguém bane o Mestre nem a si mesmo; sem permissão, não bane", async () => {
    const m = await membroAprovado("dora@example.com", "Dora");
    const alvo = await membroAprovado("eli@example.com", "Eli");
    await negado(b.como(m.user, "select public.ban_member($1, true)", [alvo.id]));
    // Com "excluir" em Membros, Dora bane o Eli, mas nunca o Mestre nem ela mesma.
    await b.como(admin, "select public.set_person_permission($1, 'membros', true, true, true)", [m.id]);
    await b.como(m.user, "select public.ban_member($1, true)", [alvo.id]);
    expect(await status(alvo.id)).toBe("banned");
    await negado(b.como(m.user, "select public.ban_member($1, true)", [adminId]));
    await negado(b.como(m.user, "select public.ban_member($1, true)", [m.id]));
    // Só "editar" em Membros (aprovar) não basta para desbanir.
    await b.como(admin, "select public.set_person_permission($1, 'membros', true, true, false)", [m.id]);
    await negado(b.como(m.user, "select public.ban_member($1, false)", [alvo.id]));
  });
});

describe("Excluir cadastro", () => {
  it("apaga a pessoa e o núcleo vazio, e devolve o login para apagar a conta", async () => {
    const m = await membroAprovado("fabi@example.com", "Fabi");
    const ev = await aventura("Teste sem custos");
    await b.admin("insert into public.attendances (event_id, person_id, status) values ($1, $2, 'vai')", [ev, m.id]);
    const [r] = await b.como<{ login: string }>(admin, "select public.delete_member($1) as login", [m.id]);
    expect(r.login).toBe(m.user);
    expect(await b.admin("select 1 from public.people where id = $1", [m.id])).toHaveLength(0);
    expect(await b.admin("select 1 from public.households where id = $1", [m.household])).toHaveLength(0);
  });

  it("mantém o núcleo quando há outras pessoas nele", async () => {
    const m = await membroAprovado("gil@example.com", "Gil");
    await b.admin("insert into public.people (household_id, name, is_child) values ($1, 'Filho do Gil', true)", [
      m.household,
    ]);
    await b.como(admin, "select public.delete_member($1)", [m.id]);
    expect(await b.admin("select 1 from public.households where id = $1", [m.household])).toHaveLength(1);
  });

  it("bloqueia quando mexeria em dinheiro (aventura com custos ou Baú da família)", async () => {
    const m = await membroAprovado("hugo@example.com", "Hugo");
    const ev = await aventura("Com custos");
    await b.admin("insert into public.attendances (event_id, person_id, status) values ($1, $2, 'vai')", [ev, m.id]);
    await b.admin(
      "insert into public.cost_items (event_id, category, description, amount_cents) values ($1, 'acomodacao', 'Casa', 300000)",
      [ev],
    );
    await expect(b.como(admin, "select public.delete_member($1)", [m.id])).rejects.toThrow(/Banir/);

    const n = await membroAprovado("iris@example.com", "Iris");
    const ev2 = await aventura("Baú");
    const [{ id: fundo }] = await b.admin<{ id: string }>(
      "insert into public.funds (event_id) values ($1) returning id",
      [ev2],
    );
    await b.admin(
      "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents) values ($1, 'entrada', $2, 1000)",
      [fundo, n.household],
    );
    await expect(b.como(admin, "select public.delete_member($1)", [n.id])).rejects.toThrow(/Baú/);
    expect(await status(n.id)).toBe("approved");
  });

  it("não exclui o Mestre, a si mesmo, nem sem permissão", async () => {
    const m = await membroAprovado("jade@example.com", "Jade");
    const alvo = await membroAprovado("kai@example.com", "Kai");
    await negado(b.como(m.user, "select public.delete_member($1)", [alvo.id]));
    await negado(b.como(admin, "select public.delete_member($1)", [adminId]));
    await b.como(admin, "select public.set_person_permission($1, 'membros', true, true, true)", [m.id]);
    await negado(b.como(m.user, "select public.delete_member($1)", [m.id]));
    await negado(b.como(m.user, "select public.delete_member($1)", [adminId]));
    await b.como(m.user, "select public.delete_member($1)", [alvo.id]);
    expect(await status(alvo.id)).toBeUndefined();
  });
});

describe("Sexo do personagem", () => {
  it("cada um grava o próprio; só aceita m, f ou vazio", async () => {
    const m = await membroAprovado("lia@example.com", "Lia");
    await b.como(m.user, "update public.people set gender = 'f' where id = $1", [m.id]);
    expect(await b.admin("select gender from public.people where id = $1", [m.id])).toEqual([{ gender: "f" }]);
    await expect(b.como(m.user, "update public.people set gender = 'x' where id = $1", [m.id])).rejects.toThrow();
  });
});
