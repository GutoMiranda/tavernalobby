// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

const ADMIN_EMAIL = "guto.miranda90@gmail.com";

let b: BancoDeTeste;
let admin: string;
let tesoureiro: string;
let participante: string;
let pendente: string;
let eventId: string;
let fundId: string;

/** Espera que a promessa falhe por falta de permissão (RLS, coluna sem grant ou função recusada). */
async function negado(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ code: expect.stringMatching(/^(42501|P0001)$/) });
}

beforeAll(async () => {
  b = await criarBanco();

  admin = await b.criarUsuario(ADMIN_EMAIL, "Gus Miranda");
  tesoureiro = await b.criarUsuario("tesoureiro@example.com", "Ana Tesoureira");
  participante = await b.criarUsuario("participante@example.com", "Beto Participante");
  pendente = await b.criarUsuario("pendente@example.com", "Caio Pendente");

  // Admin aprova dois membros e dá a tag Tesoureiro para um deles.
  for (const u of [tesoureiro, participante]) {
    const p = await b.pessoaDe(u);
    await b.como(admin, "select public.approve_member($1, true)", [p.id]);
  }
  const [tag] = await b.admin<{ id: string }>("select id from public.tags where name = 'Tesoureiro'");
  const t = await b.pessoaDe(tesoureiro);
  await b.como(admin, "select public.assign_tag($1, $2)", [t.id, tag.id]);

  // Admin cria uma aventura e o baú.
  [{ id: eventId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name, region) values ('Chácara de verão', 'Interior de SP') returning id",
  );
  [{ id: fundId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.funds (event_id, goal_cents) values ($1, 300000) returning id",
    [eventId],
  );
  await b.como(admin, "select public.update_fund_banking($1, 'Banco A', 'Gus Miranda', 'chave-antiga@pix')", [
    fundId,
  ]);
});

describe("primeiro login e admin", () => {
  it("o e-mail do admin vira admin aprovado automaticamente", async () => {
    const p = await b.pessoaDe(admin);
    expect(p.is_admin).toBe(true);
    expect(p.status).toBe("approved");
  });

  it("outros e-mails entram como pendentes, cada um com seu núcleo", async () => {
    const p = await b.pessoaDe(pendente);
    expect(p.is_admin).toBe(false);
    expect(p.status).toBe("pending");
    const [h] = await b.admin<{ responsible_person_id: string }>(
      "select responsible_person_id from public.households where id = $1",
      [p.household_id],
    );
    expect(h.responsible_person_id).toBe(p.id);
  });

  it("existe um único admin", async () => {
    const t = await b.pessoaDe(tesoureiro);
    await expect(b.admin("update public.people set is_admin = true where id = $1", [t.id])).rejects.toThrow();
  });

  it("só o admin aprova membros", async () => {
    const p = await b.pessoaDe(pendente);
    await negado(b.como(participante, "select public.approve_member($1, true)", [p.id]));
  });

  it("membro não consegue se aprovar nem virar admin pela tabela", async () => {
    await negado(b.como(pendente, "update public.people set status = 'approved' where user_id = auth.uid()"));
    await negado(b.como(participante, "update public.people set is_admin = true where user_id = auth.uid()"));
  });
});

describe("membro não aprovado", () => {
  it("só lê o próprio status", async () => {
    const pessoas = await b.como<{ user_id: string; status: string }>(pendente, "select user_id, status from public.people");
    expect(pessoas).toHaveLength(1);
    expect(pessoas[0]).toMatchObject({ user_id: pendente, status: "pending" });
  });

  it("não lê dados do grupo", async () => {
    for (const tabela of ["events", "funds", "fund_transactions", "tags", "groups", "fund_settings_history"]) {
      const linhas = await b.como(pendente, `select * from public.${tabela}`);
      expect(linhas, tabela).toHaveLength(0);
    }
  });

  it("não escreve nada", async () => {
    await negado(
      b.como(pendente, "insert into public.events (name) values ('Aventura pirata')"),
    );
    const p = await b.pessoaDe(pendente);
    await negado(
      b.como(
        pendente,
        "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by) values ($1, 'entrada', $2, 1000, $3)",
        [fundId, p.household_id, p.id],
      ),
    );
  });

  it("visitante não logado não lê nada", async () => {
    await negado(b.anonimo("select * from public.people"));
    await negado(b.anonimo("select * from public.events"));
  });
});

describe("membro aprovado", () => {
  it("lê os dados do grupo", async () => {
    const eventos = await b.como(participante, "select * from public.events");
    expect(eventos).toHaveLength(1);
    const pessoas = await b.como(participante, "select * from public.people");
    expect(pessoas.length).toBeGreaterThanOrEqual(4);
  });

  it("não cria aventura (só admin)", async () => {
    await negado(b.como(participante, "insert into public.events (name) values ('Minha aventura')"));
  });

  it("cadastra dependente só no próprio núcleo", async () => {
    const p = await b.pessoaDe(participante);
    const [dep] = await b.como<{ status: string; is_child: boolean }>(
      participante,
      "insert into public.people (household_id, name, relationship, is_child) values ($1, 'Duda', 'filha', true) returning status, is_child",
      [p.household_id],
    );
    expect(dep).toMatchObject({ status: "approved", is_child: true });

    const outro = await b.pessoaDe(tesoureiro);
    await negado(
      b.como(
        participante,
        "insert into public.people (household_id, name, relationship) values ($1, 'Intruso', 'primo')",
        [outro.household_id],
      ),
    );
  });

  it("confirma presença de quem é do núcleo, mas não de outro núcleo", async () => {
    const [dep] = await b.admin<{ id: string }>("select id from public.people where name = 'Duda'");
    await b.como(participante, "insert into public.attendances (event_id, person_id, status) values ($1, $2, 'vai')", [
      eventId,
      dep.id,
    ]);
    const t = await b.pessoaDe(tesoureiro);
    await negado(
      b.como(participante, "insert into public.attendances (event_id, person_id, status) values ($1, $2, 'vai')", [
        eventId,
        t.id,
      ]),
    );
  });

  it("reage a datas só em nome próprio", async () => {
    const [opcao] = await b.como<{ id: string }>(
      admin,
      "insert into public.date_options (event_id, start_date, end_date) values ($1, '2027-01-08', '2027-01-10') returning id",
      [eventId],
    );
    const p = await b.pessoaDe(participante);
    await b.como(participante, "insert into public.date_reactions (date_option_id, person_id, value) values ($1, $2, 1)", [
      opcao.id,
      p.id,
    ]);
    const t = await b.pessoaDe(tesoureiro);
    await negado(
      b.como(participante, "insert into public.date_reactions (date_option_id, person_id, value) values ($1, $2, -1)", [
        opcao.id,
        t.id,
      ]),
    );
  });
});

describe("baú: depósitos", () => {
  let depositoId: string;

  it("participante registra depósito do próprio núcleo, sempre pendente", async () => {
    const p = await b.pessoaDe(participante);
    [{ id: depositoId }] = await b.como<{ id: string; status: string }>(
      participante,
      "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by) values ($1, 'entrada', $2, 50000, $3) returning id, status",
      [fundId, p.household_id, p.id],
    );
    const [tx] = await b.admin<{ status: string }>("select status from public.fund_transactions where id = $1", [depositoId]);
    expect(tx.status).toBe("pendente");
  });

  it("participante não registra depósito já confirmado nem saída", async () => {
    const p = await b.pessoaDe(participante);
    await negado(
      b.como(
        participante,
        "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by, status) values ($1, 'entrada', $2, 1000, $3, 'confirmado')",
        [fundId, p.household_id, p.id],
      ),
    );
    await negado(
      b.como(
        participante,
        "insert into public.fund_transactions (fund_id, kind, household_id, amount_cents, created_by) values ($1, 'saida', $2, 1000, $3)",
        [fundId, p.household_id, p.id],
      ),
    );
  });

  it("participante não confirma depósito", async () => {
    await negado(b.como(participante, "select public.confirm_deposit($1)", [depositoId]));
    await negado(
      b.como(participante, "update public.fund_transactions set status = 'confirmado' where id = $1", [depositoId]),
    );
  });

  it("tesoureiro confirma e quem depositou recebe 'Loot guardado'", async () => {
    await b.como(tesoureiro, "select public.confirm_deposit($1)", [depositoId]);
    const [tx] = await b.admin<{ status: string; reviewed_by: string }>(
      "select status, reviewed_by from public.fund_transactions where id = $1",
      [depositoId],
    );
    const t = await b.pessoaDe(tesoureiro);
    expect(tx).toMatchObject({ status: "confirmado", reviewed_by: t.id });

    const notificacoes = await b.como<{ kind: string }>(participante, "select kind from public.notifications");
    expect(notificacoes.map((n) => n.kind)).toContain("loot_guardado");
  });

  it("cada um só vê as próprias notificações", async () => {
    const doTesoureiro = await b.como<{ kind: string }>(tesoureiro, "select kind from public.notifications where kind = 'loot_guardado'");
    expect(doTesoureiro).toHaveLength(0);
  });

  it("nada é apagado: nem o tesoureiro apaga lançamentos", async () => {
    await negado(b.como(tesoureiro, "delete from public.fund_transactions where id = $1", [depositoId]));
    await negado(b.como(admin, "delete from public.fund_transactions where id = $1", [depositoId]));
  });

  it("estorno cria lançamento inverso e só pode acontecer uma vez", async () => {
    await negado(b.como(participante, "select public.reverse_transaction($1, 'erro')", [depositoId]));
    const [{ reverse_transaction: estornoId }] = await b.como<{ reverse_transaction: string }>(
      tesoureiro,
      "select public.reverse_transaction($1, 'Valor lançado em dobro')",
      [depositoId],
    );
    const [estorno] = await b.admin<{ kind: string; amount_cents: number; reverses_id: string }>(
      "select kind, amount_cents, reverses_id from public.fund_transactions where id = $1",
      [estornoId],
    );
    expect(estorno).toMatchObject({ kind: "estorno", amount_cents: 50000, reverses_id: depositoId });
    await expect(b.como(tesoureiro, "select public.reverse_transaction($1, 'de novo')", [depositoId])).rejects.toThrow();
  });

  it("só o tesoureiro registra saídas", async () => {
    await negado(
      b.como(participante, "select public.register_withdrawal($1, 20000, null, 'Sinal da casa')", [fundId]),
    );
    const [{ register_withdrawal: id }] = await b.como<{ register_withdrawal: string }>(
      tesoureiro,
      "select public.register_withdrawal($1, 20000, null, 'Sinal da casa')",
      [fundId],
    );
    const [saida] = await b.admin<{ kind: string; status: string }>(
      "select kind, status from public.fund_transactions where id = $1",
      [id],
    );
    expect(saida).toMatchObject({ kind: "saida", status: "confirmado" });
  });
});

describe("baú: banco e chave Pix", () => {
  it("tesoureiro não altera Pix", async () => {
    await negado(
      b.como(tesoureiro, "select public.update_fund_banking($1, 'Banco B', 'Ana', 'chave-nova@pix')", [fundId]),
    );
    await negado(b.como(tesoureiro, "update public.funds set pix_key = 'golpe@pix' where id = $1", [fundId]));
  });

  it("nem o admin altera Pix direto na tabela (só pela função auditada)", async () => {
    await negado(b.como(admin, "update public.funds set pix_key = 'direto@pix' where id = $1", [fundId]));
  });

  it("admin troca o Pix: grava histórico, marca o aviso e notifica todos", async () => {
    await b.como(admin, "select public.update_fund_banking($1, 'Banco B', 'Gus Miranda', 'chave-nova@pix')", [fundId]);

    const [fundo] = await b.admin<{ pix_key: string; pix_changed_at: Date | null }>(
      "select pix_key, pix_changed_at from public.funds where id = $1",
      [fundId],
    );
    expect(fundo.pix_key).toBe("chave-nova@pix");
    expect(fundo.pix_changed_at).not.toBeNull();

    const historico = await b.como<{ old_pix_key: string; new_pix_key: string }>(
      participante,
      "select old_pix_key, new_pix_key from public.fund_settings_history where fund_id = $1 order by changed_at",
      [fundId],
    );
    expect(historico.at(-1)).toMatchObject({ old_pix_key: "chave-antiga@pix", new_pix_key: "chave-nova@pix" });

    for (const u of [admin, tesoureiro, participante]) {
      const n = await b.como(u, "select 1 from public.notifications where kind = 'pix_alterado'");
      expect(n).toHaveLength(1);
    }
    // Quem ainda não foi aprovado não recebe.
    const [{ total }] = await b.admin<{ total: number }>(
      "select count(*)::int as total from public.notifications n join public.people p on p.id = n.recipient_person_id where p.user_id = $1",
      [pendente],
    );
    expect(total).toBe(0);
  });

  it("ninguém escreve no histórico de alterações", async () => {
    await negado(
      b.como(admin, "insert into public.fund_settings_history (fund_id, new_pix_key) values ($1, 'falso')", [fundId]),
    );
  });
});

describe("tags", () => {
  it("só o admin atribui tags", async () => {
    const [tag] = await b.admin<{ id: string }>("select id from public.tags where name = 'Tesoureiro'");
    const p = await b.pessoaDe(participante);
    await negado(b.como(tesoureiro, "select public.assign_tag($1, $2)", [p.id, tag.id]));
    await negado(
      b.como(participante, "insert into public.person_tags (person_id, tag_id) values ($1, $2)", [p.id, tag.id]),
    );
  });
});

describe("comprovantes (storage)", () => {
  it("membro aprovado envia comprovante só na própria pasta", async () => {
    await b.como(participante, "insert into storage.objects (bucket_id, name) values ('comprovantes', $1)", [
      `${participante}/deposito.jpg`,
    ]);
    await negado(
      b.como(participante, "insert into storage.objects (bucket_id, name) values ('comprovantes', $1)", [
        `${tesoureiro}/falso.jpg`,
      ]),
    );
  });

  it("não aprovado não envia nem lê comprovantes", async () => {
    await negado(
      b.como(pendente, "insert into storage.objects (bucket_id, name) values ('comprovantes', $1)", [
        `${pendente}/x.jpg`,
      ]),
    );
    const linhas = await b.como(pendente, "select * from storage.objects");
    expect(linhas).toHaveLength(0);
  });

  it("bucket é privado", async () => {
    const [bucket] = await b.admin<{ public: boolean }>("select public from storage.buckets where id = 'comprovantes'");
    expect(bucket.public).toBe(false);
  });
});
