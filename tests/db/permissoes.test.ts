// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let tesoureiro: string;
let biaId: string;
let tagOrganizador: string;
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

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  tesoureiro = await b.criarUsuario("tesoureiro@example.com", "Teo");
  for (const u of [bia, caio, tesoureiro])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  biaId = (await b.pessoaDe(bia)).id;
  const [tes] = await b.admin<{ id: string }>("select id from public.tags where name = 'Tesoureiro'");
  await b.como(admin, "select public.assign_tag($1, $2)", [(await b.pessoaDe(tesoureiro)).id, tes.id]);
  [{ id: eventoId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name) values ('Páscoa') returning id",
  );
});

describe("Permissões por aba", () => {
  it("as tags antigas mantêm o que faziam: Tesoureiro no Baú, Despensa no Armazém", async () => {
    const linhas = await b.admin<{
      name: string;
      area: string;
      can_view: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }>(
      "select t.name, tp.area, tp.can_view, tp.can_edit, tp.can_delete from public.tag_permissions tp join public.tags t on t.id = tp.tag_id order by t.name",
    );
    expect(linhas).toEqual([
      { name: "Despensa", area: "armazem", can_view: true, can_edit: true, can_delete: true },
      { name: "Tesoureiro", area: "bau", can_view: true, can_edit: true, can_delete: true },
    ]);
    expect((await permissoes(tesoureiro)).bau).toEqual([true, true, true]);
    expect((await permissoes(tesoureiro)).custos).toEqual([false, false, false]);
  });

  it("o Mestre pode tudo; membro sem tag não pode nada", async () => {
    const doMestre = await permissoes(admin);
    expect(Object.keys(doMestre)).toHaveLength(9);
    expect(Object.values(doMestre).every((p) => p.every(Boolean))).toBe(true);
    const daBia = await permissoes(bia);
    expect(Object.values(daBia).some((p) => p.some(Boolean))).toBe(false);
  });

  it("só o Mestre cria tags e define permissões", async () => {
    await negado(b.como(bia, "insert into public.tags (name) values ('Organizador')"));
    [{ id: tagOrganizador }] = await b.como<{ id: string }>(
      admin,
      "insert into public.tags (name, label) values ('Organizador', 'Escriba das Datas') returning id",
    );
    await negado(
      b.como(
        bia,
        "insert into public.tag_permissions (tag_id, area, can_view, can_edit) values ($1, 'datas', true, true)",
        [tagOrganizador],
      ),
    );
    await b.como(
      admin,
      "insert into public.tag_permissions (tag_id, area, can_view, can_edit) values ($1, 'datas', true, true)",
      [tagOrganizador],
    );
  });

  it("editar ou excluir exige ver", async () => {
    await expect(
      b.como(admin, "insert into public.tag_permissions (tag_id, area, can_edit) values ($1, 'custos', true)", [
        tagOrganizador,
      ]),
    ).rejects.toThrow(/tag_permissions_ver_antes/);
  });

  it("com a tag, a pessoa edita a aba liberada, mas não exclui nem mexe em outra aba", async () => {
    await negado(
      b.como(
        bia,
        "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-04-01', '2027-04-04')",
        [eventoId],
      ),
    );
    await b.como(admin, "select public.assign_tag($1, $2)", [biaId, tagOrganizador]);
    expect((await permissoes(bia)).datas).toEqual([true, true, false]);

    const [{ id: dataId }] = await b.como<{ id: string }>(
      bia,
      "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-04-01', '2027-04-04') returning id",
      [eventoId],
    );
    // Fechar a votação grava a data escolhida na aventura.
    await b.como(bia, "update public.events set chosen_date_option_id = $2 where id = $1", [eventoId, dataId]);
    const [ev] = await b.admin<{ chosen_date_option_id: string }>(
      "select chosen_date_option_id from public.events where id = $1",
      [eventoId],
    );
    expect(ev.chosen_date_option_id).toBe(dataId);

    // Sem "excluir", a remoção não apaga nada.
    await b.como(bia, "delete from public.date_options where id = $1", [dataId]);
    expect(await b.admin("select 1 from public.date_options where id = $1", [dataId])).toHaveLength(1);

    // Outras abas continuam fechadas.
    await negado(b.como(bia, "insert into public.events (name) values ('Outra')"));
    await negado(
      b.como(
        bia,
        "insert into public.cost_items (event_id, category, description, amount_cents) values ($1, 'extra', 'Bolo', 100)",
        [eventoId],
      ),
    );
    await b.como(bia, "delete from public.events where id = $1", [eventoId]);
    expect(await b.admin("select 1 from public.events where id = $1", [eventoId])).toHaveLength(1);
  });

  it("liberar 'excluir' depois vale na hora; tirar a tag tira a permissão", async () => {
    await b.como(admin, "update public.tag_permissions set can_delete = true where tag_id = $1 and area = 'datas'", [
      tagOrganizador,
    ]);
    const [{ id: dataId }] = await b.como<{ id: string }>(
      bia,
      "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-05-01', '2027-05-03') returning id",
      [eventoId],
    );
    await b.como(bia, "delete from public.date_options where id = $1", [dataId]);
    expect(await b.admin("select 1 from public.date_options where id = $1", [dataId])).toHaveLength(0);

    await b.como(admin, "select public.remove_tag($1, $2)", [biaId, tagOrganizador]);
    expect((await permissoes(bia)).datas).toEqual([false, false, false]);
    await negado(
      b.como(
        bia,
        "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-06-01', '2027-06-02')",
        [eventoId],
      ),
    );
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
    await negado(b.como(caio, "select public.confirm_deposit($1)", [dep]));

    const [tes] = await b.admin<{ id: string }>("select id from public.tags where name = 'Tesoureiro'");
    await b.como(admin, "update public.tag_permissions set can_delete = false where tag_id = $1 and area = 'bau'", [
      tes.id,
    ]);
    await b.como(tesoureiro, "select public.confirm_deposit($1)", [dep]);
    await negado(b.como(tesoureiro, "select public.reverse_transaction($1, 'teste')", [dep]));
    // O Mestre também confere e estorna.
    await b.como(admin, "select public.reverse_transaction($1, 'teste')", [dep]);
  });

  it("chat: moderador com 'excluir' apaga mensagem dos outros", async () => {
    const [{ id: msg }] = await b.como<{ id: string }>(
      caio,
      "select public.post_chat_message('oi', false, '{}', null) as id",
    );
    await negado(b.como(bia, "select public.delete_chat_message($1)", [msg]));
    const [{ id: tagMod }] = await b.como<{ id: string }>(
      admin,
      "insert into public.tags (name, label) values ('Moderador', 'Arauto do Chat') returning id",
    );
    await b.como(
      admin,
      "insert into public.tag_permissions (tag_id, area, can_view, can_edit, can_delete) values ($1, 'chat', true, true, true)",
      [tagMod],
    );
    await b.como(admin, "select public.assign_tag($1, $2)", [biaId, tagMod]);
    await b.como(bia, "select public.delete_chat_message($1)", [msg]);
    const [m] = await b.admin<{ deleted_at: string | null }>(
      "select deleted_at from public.chat_messages where id = $1",
      [msg],
    );
    expect(m.deleted_at).not.toBeNull();
  });

  it("Membros: aprovar exige a permissão; tags e Pix continuam só do Mestre", async () => {
    const novo = await b.criarUsuario("novo@example.com", "Novo");
    const novoId = (await b.pessoaDe(novo)).id;
    await negado(b.como(caio, "select public.approve_member($1, true)", [novoId]));
    const [{ id: tagPorteiro }] = await b.como<{ id: string }>(
      admin,
      "insert into public.tags (name) values ('Porteiro') returning id",
    );
    await b.como(
      admin,
      "insert into public.tag_permissions (tag_id, area, can_view, can_edit, can_delete) values ($1, 'membros', true, true, true)",
      [tagPorteiro],
    );
    const caioId = (await b.pessoaDe(caio)).id;
    await b.como(admin, "select public.assign_tag($1, $2)", [caioId, tagPorteiro]);
    await b.como(caio, "select public.approve_member($1, true)", [novoId]);
    expect((await b.pessoaDe(novo)).status).toBe("approved");
    await negado(b.como(caio, "select public.assign_tag($1, $2)", [caioId, tagOrganizador]));
    await b.como(caio, "update public.tag_permissions set area = 'bau' where tag_id = $1", [tagPorteiro]);
    const [perm] = await b.admin<{ area: string }>("select area from public.tag_permissions where tag_id = $1", [
      tagPorteiro,
    ]);
    expect(perm.area).toBe("membros");
  });
});
