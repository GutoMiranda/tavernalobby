// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { type BancoDeTeste, criarBanco } from "./helpers";

let b: BancoDeTeste;
let admin: string;
let bia: string;
let caio: string;
let eventoId: string;
let chale: string;
let pousada: string;

const negado = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "42501" });
const evento = async () =>
  (
    await b.admin<{ chosen_accommodation_id: string | null; phase: string }>(
      "select chosen_accommodation_id, phase from public.events where id = $1",
      [eventoId],
    )
  )[0];
const curtir = (u: string, alvo: string) =>
  b.como(
    u,
    "insert into public.accommodation_reactions (accommodation_id, person_id, value) values ($1, public.current_person_id(), 1)",
    [alvo],
  );

beforeAll(async () => {
  b = await criarBanco();
  admin = await b.criarUsuario("guto.miranda90@gmail.com", "Gus");
  bia = await b.criarUsuario("bia@example.com", "Bia");
  caio = await b.criarUsuario("caio@example.com", "Caio");
  for (const u of [bia, caio]) await b.como(admin, "select public.approve_member($1, true)", [(await b.pessoaDe(u)).id]);
  [{ id: eventoId }] = await b.como<{ id: string }>(
    admin,
    "insert into public.events (name, phase) values ('Páscoa', 'estalagens') returning id",
  );
  const criar = async (nome: string) =>
    (
      await b.como<{ id: string }>(
        bia,
        "insert into public.accommodations (event_id, name, total_price_cents, created_by) values ($1, $2, 300000, public.current_person_id()) returning id",
        [eventoId, nome],
      )
    )[0].id;
  chale = await criar("Chalé");
  pousada = await criar("Pousada");
  // Bia edita estalagens, mas não decide.
  await b.como(admin, "select public.set_person_permission($1, 'estalagens', true, true, true)", [
    (await b.pessoaDe(bia)).id,
  ]);
});

describe("Decidir a estalagem", () => {
  it("só o Mestre decide por padrão; editar estalagens não basta", async () => {
    await negado(b.como(bia, "select public.decide_accommodation($1, $2)", [eventoId, chale]));
    await negado(b.como(bia, "update public.events set chosen_accommodation_id = $2 where id = $1", [eventoId, chale]));
    expect((await evento()).chosen_accommodation_id).toBeNull();
  });

  it("decidir define o destino, avança para a presença e encerra as curtidas", async () => {
    await curtir(caio, pousada);
    const [r] = await b.como<{ decide_accommodation: string }>(admin, "select public.decide_accommodation($1, $2)", [
      eventoId,
      chale,
    ]);
    expect(r.decide_accommodation).toBe("avancou");
    expect(await evento()).toEqual({ chosen_accommodation_id: chale, phase: "presenca" });
    await negado(curtir(bia, chale));
    await negado(
      b.como(caio, "delete from public.accommodation_reactions where person_id = public.current_person_id()"),
    );
  });

  it("quem recebe a permissão troca e desfaz; desfazer reabre as curtidas", async () => {
    await b.como(admin, "select public.set_person_permission($1, 'decisao', true, true, false)", [
      (await b.pessoaDe(caio)).id,
    ]);
    await b.como(caio, "select public.decide_accommodation($1, $2)", [eventoId, pousada]);
    expect((await evento()).chosen_accommodation_id).toBe(pousada);
    await b.como(caio, "select public.undo_accommodation_decision($1)", [eventoId]);
    expect(await evento()).toEqual({ chosen_accommodation_id: null, phase: "estalagens" });
    await curtir(bia, chale);
  });

  it("recusa estalagem de outra aventura", async () => {
    const [{ id: outro }] = await b.como<{ id: string }>(
      admin,
      "insert into public.events (name) values ('Réveillon') returning id",
    );
    await expect(b.como(admin, "select public.decide_accommodation($1, $2)", [outro, chale])).rejects.toThrow(
      /não encontrada/,
    );
  });

  it("apagar a estalagem definida continua funcionando", async () => {
    await b.como(admin, "select public.decide_accommodation($1, $2)", [eventoId, chale]);
    await b.como(bia, "delete from public.accommodations where id = $1", [chale]);
    expect((await evento()).chosen_accommodation_id).toBeNull();
  });
});
