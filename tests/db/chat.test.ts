// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let novato: string;
let biaId: string;
let caioId: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  novato = await b.criarUsuario("novato@example.com", "Novato");
  for (const u of [bia, caio])
    await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  biaId = (await b.pessoaDe(bia)).id;
  caioId = (await b.pessoaDe(caio)).id;
});

const enviar = (u: string, corpo: string, pergunta = false, mencoes: string[] = [], resposta: string | null = null) =>
  b.como<{ id: string }>(u, "select public.post_chat_message($1, $2, $3::uuid[], $4) as id", [
    corpo,
    pergunta,
    mencoes,
    resposta,
  ]);

describe("Personagem (avatar e epíteto)", () => {
  it("membro escolhe avatar, cor e epíteto da própria pessoa", async () => {
    await b.como(
      bia,
      "update public.people set avatar = 'bardo', avatar_color = 'vinho', epithet = 'a Bardo do Churrasco' where id = $1",
      [biaId],
    );
    const [p] = await b.como<{ avatar: string; epithet: string }>(
      caio,
      "select avatar, epithet from public.people where id = $1",
      [biaId],
    );
    expect(p).toEqual({ avatar: "bardo", epithet: "a Bardo do Churrasco" });
  });

  it("não muda o personagem de outro núcleo e não aceita avatar fora da lista", async () => {
    const r = await b.como(caio, "update public.people set avatar = 'maga' where id = $1 returning id", [biaId]);
    expect(r).toHaveLength(0);
    await expect(b.como(bia, "update public.people set avatar = 'unicornio' where id = $1", [biaId])).rejects.toThrow();
  });
});

describe("Chat geral", () => {
  let pergunta: string;

  it("membro aprovado envia mensagem e todos leem; quem não foi aprovado não lê nem envia", async () => {
    const [{ id }] = await enviar(bia, "Bora marcar o churrasco?");
    const lidas = await b.como(caio, "select body from public.chat_messages where id = $1", [id]);
    expect(lidas).toEqual([{ body: "Bora marcar o churrasco?" }]);
    expect(await b.como(novato, "select 1 from public.chat_messages")).toHaveLength(0);
    await negado(enviar(novato, "oi"));
  });

  it("ninguém escreve direto na tabela (só pela função)", async () => {
    await expect(
      b.como(bia, "insert into public.chat_messages (author_person_id, body) values ($1, 'x')", [caioId]),
    ).rejects.toThrow();
    await expect(b.como(bia, "update public.chat_messages set body = 'x'")).rejects.toThrow();
  });

  it("mensagem vazia ou longa demais é recusada", async () => {
    await expect(enviar(bia, "   ")).rejects.toThrow(/1 a 2000/);
    await expect(enviar(bia, "a".repeat(2001))).rejects.toThrow(/1 a 2000/);
  });

  it("menção avisa no sino quem foi mencionado (não avisa a si mesmo)", async () => {
    const [{ id }] = await enviar(bia, "@Caio leva o carvão", false, [caioId, biaId]);
    const avisos = await b.como<{ kind: string; link: string; actor_person_id: string }>(
      caio,
      "select kind, link, actor_person_id from public.notifications where kind like 'chat%'",
    );
    expect(avisos).toEqual([{ kind: "chat_mencao", link: `/chat#m-${id}`, actor_person_id: biaId }]);
    expect(await b.como(bia, "select 1 from public.notifications where kind like 'chat%'")).toHaveLength(0);
  });

  it("dúvida direcionada avisa como pergunta; resposta avisa quem perguntou", async () => {
    [{ id: pergunta }] = await enviar(caio, "Quanto fica a carne?", true, [biaId]);
    const [aviso] = await b.como<{ kind: string; message: string }>(
      bia,
      "select kind, message from public.notifications where kind = 'chat_pergunta'",
    );
    expect(aviso.message).toContain("Caio te fez uma pergunta");
    await enviar(bia, "Uns R$ 60 o kg", false, [], pergunta);
    const respostas = await b.como(caio, "select 1 from public.notifications where kind = 'chat_resposta'");
    expect(respostas).toHaveLength(1);
  });

  it("só quem perguntou ou o admin marcam a dúvida como resolvida", async () => {
    await negado(b.como(bia, "select public.toggle_chat_question_resolved($1)", [pergunta]));
    const [r] = await b.como<{ ok: boolean }>(caio, "select public.toggle_chat_question_resolved($1) as ok", [
      pergunta,
    ]);
    expect(r.ok).toBe(true);
    const [r2] = await b.como<{ ok: boolean }>(admin, "select public.toggle_chat_question_resolved($1) as ok", [
      pergunta,
    ]);
    expect(r2.ok).toBe(false);
  });

  it("só o autor ou o admin apagam; o texto some e o registro fica", async () => {
    const [{ id }] = await enviar(caio, "mensagem errada");
    await negado(b.como(bia, "select public.delete_chat_message($1)", [id]));
    await b.como(caio, "select public.delete_chat_message($1)", [id]);
    const [m] = await b.como<{ body: string; deleted_at: string | null }>(
      bia,
      "select body, deleted_at from public.chat_messages where id = $1",
      [id],
    );
    expect(m.body).toBe("");
    expect(m.deleted_at).not.toBeNull();
    const [{ id: outra }] = await enviar(bia, "outra");
    await b.como(admin, "select public.delete_chat_message($1)", [outra]);
  });
});

describe("Foto do avatar", () => {
  it("membro envia foto só na própria pasta e grava o caminho na pessoa", async () => {
    const pasta = bia;
    const caminho = `${pasta}/11111111-1111-1111-1111-111111111111.webp`;
    await b.como(bia, "insert into storage.objects (bucket_id, name) values ('avatares', $1)", [caminho]);
    await expect(
      b.como(bia, "insert into storage.objects (bucket_id, name) values ('avatares', $1)", [
        `${caio}/22222222-2222-2222-2222-222222222222.webp`,
      ]),
    ).rejects.toThrow();
    await b.como(bia, "update public.people set avatar_path = $2 where id = $1", [biaId, caminho]);
    const [p] = await b.como<{ avatar_path: string }>(caio, "select avatar_path from public.people where id = $1", [
      biaId,
    ]);
    expect(p.avatar_path).toBe(caminho);
    expect(await b.como(caio, "select 1 from storage.objects where bucket_id = 'avatares'")).toHaveLength(1);
    expect(await b.como(novato, "select 1 from storage.objects where bucket_id = 'avatares'")).toHaveLength(0);
  });

  it("caminho fora do padrão é recusado", async () => {
    await expect(
      b.como(bia, "update public.people set avatar_path = '../outra/coisa.png' where id = $1", [biaId]),
    ).rejects.toThrow();
  });
});
