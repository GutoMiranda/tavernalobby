// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let tesoureiro: string;
let biaId: string;
let caioId: string;
let adminId: string;
let eventoId: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });

type Perm = { area: string; ver: boolean; editar: boolean; excluir: boolean };
const permissoes = async (u: string) =>
  Object.fromEntries(
    (await b.como<Perm>(u, "select * from public.minhas_permissoes()")).map((p) => [
      p.area,
      [p.ver, p.editar, p.excluir],
    ]),
  );
const dar = (quem: string, alvo: string, area: string, ver: boolean, editar: boolean, excluir: boolean) =>
  b.como(quem, "select public.set_person_permission($1, $2, $3, $4, $5)", [alvo, area, ver, editar, excluir]);

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  tesoureiro = await b.criarUsuario("tesoureiro@example.com", "Teo");
  for (const u of [bia, caio, tesoureiro])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  biaId = (await b.pessoaDe(bia)).id;
  caioId = (await b.pessoaDe(caio)).id;
  adminId = (await b.pessoaDe(admin)).id;
  [{ id: eventoId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name) values ('Páscoa') returning id",
  );
});

describe("Permissões por pessoa", () => {
  it("o Mestre pode tudo (inclusive a tela de permissões); membro novo não pode nada", async () => {
    const doMestre = await permissoes(admin);
    expect(Object.keys(doMestre)).toHaveLength(10);
    expect(Object.values(doMestre).every((p) => p.every(Boolean))).toBe(true);
    const daBia = await permissoes(bia);
    expect(Object.values(daBia).some((p) => p.some(Boolean))).toBe(false);
  });

  it("tag não dá permissão: é só título", async () => {
    const [tes] = await b.admin<{ id: string }>("select id from public.tags where name = 'Tesoureiro'");
    await b.como(admin, "select public.assign_tag($1, $2)", [(await b.pessoaDe(tesoureiro)).id, tes.id]);
    expect((await permissoes(tesoureiro)).bau).toEqual([false, false, false]);
  });

  it("ninguém grava direto na tabela; membro sem permissão não dá permissão", async () => {
    await negado(
      b.como(bia, "insert into public.person_permissions (person_id, area, can_view) values ($1, 'bau', true)", [
        biaId,
      ]),
    );
    await negado(dar(bia, caioId, "datas", true, true, false));
  });

  it("o Mestre dá permissão a uma pessoa; editar já inclui ver", async () => {
    await negado(
      b.como(
        bia,
        "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-04-01', '2027-04-04')",
        [eventoId],
      ),
    );
    await dar(admin, biaId, "datas", false, true, false);
    expect((await permissoes(bia)).datas).toEqual([true, true, false]);

    const [{ id: dataId }] = await b.como<{ id: string }>(
      bia,
      "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-04-01', '2027-04-04') returning id",
      [eventoId],
    );
    // Sem "excluir", a remoção não apaga nada.
    await b.como(bia, "delete from public.date_options where id = $1", [dataId]);
    expect(await b.admin("select 1 from public.date_options where id = $1", [dataId])).toHaveLength(1);
    // Só a pessoa recebeu: o Caio continua sem.
    expect((await permissoes(caio)).datas).toEqual([false, false, false]);
    // Outras abas continuam fechadas.
    await negado(b.como(bia, "insert into public.events (name) values ('Outra')"));
  });

  it("quem pode editar Permissões dá e tira dos outros, mas não de si nem do Mestre", async () => {
    await dar(admin, caioId, "permissoes", true, true, false);
    await dar(caio, biaId, "datas", true, true, true);
    expect((await permissoes(bia)).datas).toEqual([true, true, true]);
    await negado(dar(caio, caioId, "bau", true, true, true));
    await negado(dar(caio, adminId, "bau", false, false, false));

    // Quem vê a tela enxerga as permissões de todos; os demais só as próprias.
    const vistasPeloCaio = await b.como<{ person_id: string }>(caio, "select person_id from public.person_permissions");
    expect(vistasPeloCaio.some((p) => p.person_id === biaId)).toBe(true);
    const vistasPelaBia = await b.como<{ person_id: string }>(bia, "select person_id from public.person_permissions");
    expect(vistasPelaBia.every((p) => p.person_id === biaId)).toBe(true);

    // Tirar tudo apaga a linha e a permissão some na hora.
    await dar(caio, biaId, "datas", false, false, false);
    expect((await permissoes(bia)).datas).toEqual([false, false, false]);
  });

  it("só ver a tela de Permissões não deixa mudar nada", async () => {
    await dar(admin, caioId, "permissoes", true, false, false);
    await negado(dar(caio, biaId, "datas", true, false, false));
  });

  it("Baú: editar confirma depósitos; estornar exige 'excluir'", async () => {
    const [{ id: fundo }] = await b.como<{ id: string }>(
      admin,
      "insert into public.funds (event_id) values ($1) returning id",
      [eventoId],
    );
    const caioP = await b.pessoaDe(caio);
    const [{ id: dep }] = await b.como<{ id: string }>(
      caio,
      "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by) values ($1, 'entrada', $2, 5000, $3) returning id",
      [fundo, caioP.household_id, caioP.id],
    );
    await negado(b.como(tesoureiro, "select public.confirm_deposit($1)", [dep]));
    await dar(admin, (await b.pessoaDe(tesoureiro)).id, "bau", true, true, false);
    await b.como(tesoureiro, "select public.confirm_deposit($1)", [dep]);
    await negado(b.como(tesoureiro, "select public.reverse_transaction($1, 'teste')", [dep]));
    await b.como(admin, "select public.reverse_transaction($1, 'teste')", [dep]);
  });

  it("chat: com 'excluir' no Chat apaga mensagem dos outros", async () => {
    const [{ id: msg }] = await b.como<{ id: string }>(
      caio,
      "select public.post_chat_message('oi', false, '{}', null) as id",
    );
    await negado(b.como(bia, "select public.delete_chat_message($1)", [msg]));
    await dar(admin, biaId, "chat", true, true, true);
    await b.como(bia, "select public.delete_chat_message($1)", [msg]);
    const [m] = await b.admin<{ deleted_at: string | null }>(
      "select deleted_at from public.chat_messages where id = $1",
      [msg],
    );
    expect(m.deleted_at).not.toBeNull();
  });

  it("Membros: aprovar exige a permissão", async () => {
    const novo = await b.criarUsuario("novo@example.com", "Novo");
    const novoId = (await b.pessoaDe(novo)).id;
    await negado(b.como(bia, "select public.approve_member($1, true)", [novoId]));
    await dar(admin, biaId, "membros", true, true, false);
    await b.como(bia, "select public.approve_member($1, true)", [novoId]);
    expect((await b.pessoaDe(novo)).status).toBe("approved");
  });

  it("permissões que as tags davam passaram para as pessoas (migração)", async () => {
    // Banco novo, com a tag dada ANTES da migração 19: simula aplicando as migrações até a 18.
    const { PGlite } = await import("@electric-sql/pglite");
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const raiz = join(__dirname, "..", "..");
    const db = new PGlite();
    await db.exec(readFileSync(join(raiz, "tests/db/supabase-shim.sql"), "utf8"));
    const arquivos = readdirSync(join(raiz, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const ate = arquivos.findIndex((f) => f.includes("permissoes_por_pessoa"));
    for (const f of arquivos.slice(0, ate)) await db.exec(readFileSync(join(raiz, "supabase/migrations", f), "utf8"));
    await db.exec(`
      insert into auth.users (email, raw_user_meta_data) values ('t@example.com', '{"full_name":"T"}');
      update public.people set status = 'approved' where email = 't@example.com';
      insert into public.person_tags (person_id, tag_id)
        select p.id, t.id from public.people p, public.tags t where p.email = 't@example.com' and t.name = 'Tesoureiro';
    `);
    for (const f of arquivos.slice(ate)) await db.exec(readFileSync(join(raiz, "supabase/migrations", f), "utf8"));
    const r = await db.query<{ area: string; can_delete: boolean }>(
      "select area, can_delete from public.person_permissions pp join public.people p on p.id = pp.person_id where p.email = 't@example.com'",
    );
    expect(r.rows).toEqual([{ area: "bau", can_delete: true }]);
  });
});
