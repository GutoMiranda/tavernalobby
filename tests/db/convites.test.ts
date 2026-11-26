// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let membro: string;
let codigo: string;

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  membro = await b.criarUsuario("membro@example.com", "Bia Membro");
  const p = await b.pessoaDe(membro);
  await b.como(admin, "select public.approve_member($1, true)", [p.id]);
  [{ invite_code: codigo }] = await b.admin<{ invite_code: string }>("select invite_code from public.groups");
});

describe("convite do grupo", () => {
  it("visitante confere se o código é válido", async () => {
    const [ok] = await b.anonimo<{ v: boolean }>("select public.check_invite_code($1) as v", [codigo]);
    const [ruim] = await b.anonimo<{ v: boolean }>("select public.check_invite_code('xyz') as v");
    expect(ok.v).toBe(true);
    expect(ruim.v).toBe(false);
  });

  it("membro aprovado vê o código; só admin gera outro", async () => {
    const [g] = await b.como<{ invite_code: string }>(membro, "select invite_code from public.groups");
    expect(g.invite_code).toBe(codigo);
    await expect(b.como(membro, "select public.regenerate_invite_code()")).rejects.toMatchObject({ code: "42501" });
    const [{ regenerate_invite_code: novo }] = await b.como<{ regenerate_invite_code: string }>(
      admin,
      "select public.regenerate_invite_code()",
    );
    expect(novo).not.toBe(codigo);
  });
});

describe("adulto dependente assume o próprio perfil", () => {
  let depId: string;
  let token: string;

  beforeAll(async () => {
    const p = await b.pessoaDe(membro);
    [{ id: depId }] = await b.como<{ id: string }>(
      membro,
      "insert into public.people (household_id, name, relationship) values ($1, 'Caio Cônjuge', 'cônjuge') returning id",
      [p.household_id],
    );
    // Histórico do dependente (presença numa aventura).
    const [{ id: eventId }] = await b.como<{ id: string }>(
      admin,
      "insert into public.events (name) values ('Praia') returning id",
    );
    await b.como(membro, "insert into public.attendances (event_id, person_id, status) values ($1, $2, 'vai')", [
      eventId,
      depId,
    ]);
  });

  it("não dá para convidar criança nem gente de outro núcleo", async () => {
    const p = await b.pessoaDe(membro);
    const [{ id: crianca }] = await b.como<{ id: string }>(
      membro,
      "insert into public.people (household_id, name, relationship, is_child) values ($1, 'Lia', 'filha', true) returning id",
      [p.household_id],
    );
    await expect(b.como(membro, "select public.create_claim_invite($1)", [crianca])).rejects.toThrow();
    await expect(b.como(admin, "select public.create_claim_invite($1)", [depId])).rejects.toThrow();
  });

  it("ninguém lê os tokens direto", async () => {
    await expect(b.como(membro, "select * from public.claim_invites")).rejects.toMatchObject({ code: "42501" });
  });

  it("o núcleo gera o convite e a pessoa nova assume o perfil, mantendo o histórico", async () => {
    [{ create_claim_invite: token }] = await b.como<{ create_claim_invite: string }>(
      membro,
      "select public.create_claim_invite($1)",
      [depId],
    );
    const novo = await b.criarUsuario("caio@example.com", "Caio");
    const autoCriado = await b.pessoaDe(novo);
    expect(autoCriado.status).toBe("pending");

    const [info] = await b.como<{ person_name: string }>(novo, "select * from public.get_claim_invite($1)", [token]);
    expect(info.person_name).toBe("Caio Cônjuge");

    await b.como(novo, "select public.claim_dependent_profile($1)", [token]);
    const agora = await b.pessoaDe(novo);
    expect(agora.id).toBe(depId);
    expect(agora.status).toBe("approved");
    const [{ total }] = await b.admin<{ total: number }>(
      "select count(*)::int as total from public.attendances where person_id = $1",
      [depId],
    );
    expect(total).toBe(1);
    const sobra = await b.admin("select 1 from public.people where id = $1", [autoCriado.id]);
    expect(sobra).toHaveLength(0);
  });

  it("o convite só vale uma vez", async () => {
    const outro = await b.criarUsuario("outro@example.com", "Outro");
    await expect(b.como(outro, "select public.claim_dependent_profile($1)", [token])).rejects.toThrow(/inválido/);
  });

  it("conta já em uso não assume outro perfil", async () => {
    const p = await b.pessoaDe(membro);
    const [{ id: dep2 }] = await b.como<{ id: string }>(
      membro,
      "insert into public.people (household_id, name, relationship) values ($1, 'Rui', 'irmão') returning id",
      [p.household_id],
    );
    const [{ create_claim_invite: t2 }] = await b.como<{ create_claim_invite: string }>(
      membro,
      "select public.create_claim_invite($1)",
      [dep2],
    );
    await expect(b.como(admin, "select public.claim_dependent_profile($1)", [t2])).rejects.toThrow();
  });
});
