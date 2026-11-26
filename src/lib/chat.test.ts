import { describe, expect, it } from "vitest";

import {
  filtrarMensagens,
  mencaoEmCurso,
  mencoesNoTexto,
  type MensagemChat,
  rotuloDoDia,
  sugerirMembros,
  trechosComMencoes,
} from "./chat";

const membros = [
  { id: "1", name: "Bia" },
  { id: "2", name: "Júlia Souza" },
  { id: "3", name: "Gus" },
  { id: "4", name: "Fabiano" },
];

describe("menções no chat", () => {
  it("reconhece a menção sendo digitada", () => {
    expect(mencaoEmCurso("oi @Bi")).toEqual({ inicio: 3, busca: "Bi" });
    expect(mencaoEmCurso("@")).toEqual({ inicio: 0, busca: "" });
    expect(mencaoEmCurso("@Júlia S")).toEqual({ inicio: 0, busca: "Júlia S" });
    expect(mencaoEmCurso("email@exemplo")).toBeNull();
    expect(mencaoEmCurso("oi @Bia\nnova linha")).toBeNull();
    expect(mencaoEmCurso("sem arroba")).toBeNull();
  });

  it("sugere quem começa com a busca primeiro, sem acento e sem a própria pessoa", () => {
    expect(sugerirMembros("ju", membros).map((m) => m.id)).toEqual(["2"]);
    expect(sugerirMembros("bi", membros).map((m) => m.id)).toEqual(["1", "4"]);
    expect(sugerirMembros("", membros, "3").map((m) => m.id)).toEqual(["1", "2", "4"]);
  });

  it("guarda só as menções que ficaram no texto", () => {
    expect(mencoesNoTexto("@Bia e @Júlia Souza, bora?", membros)).toEqual(["1", "2"]);
    expect(mencoesNoTexto("ninguém", membros)).toEqual([]);
  });

  it("destaca as menções no texto", () => {
    expect(trechosComMencoes("oi @Júlia Souza e @Bia!", membros.slice(0, 2))).toEqual([
      { texto: "oi " },
      { texto: "@Júlia Souza", mencao: "2" },
      { texto: " e " },
      { texto: "@Bia", mencao: "1" },
      { texto: "!" },
    ]);
    expect(trechosComMencoes("sem menção", [])).toEqual([{ texto: "sem menção" }]);
  });
});

describe("listagem do chat", () => {
  it("rótulo do dia no fuso de São Paulo", () => {
    const agora = new Date("2026-11-25T15:00:00-03:00");
    expect(rotuloDoDia("2026-11-25T01:00:00-03:00", agora)).toBe("Hoje");
    expect(rotuloDoDia("2026-11-25T02:30:00Z", agora)).toBe("Ontem"); // 24/11 23:30 em SP
    expect(rotuloDoDia("2026-11-20T12:00:00-03:00", agora)).toBe("20/11/2026");
  });

  it("filtros de dúvidas abertas e menções", () => {
    const base: MensagemChat = {
      id: "a",
      author_person_id: "1",
      body: "x",
      is_question: false,
      reply_to: null,
      resolved_at: null,
      deleted_at: null,
      created_at: "",
      mencoes: [],
    };
    const ms = [
      base,
      { ...base, id: "b", is_question: true },
      { ...base, id: "c", is_question: true, resolved_at: "x" },
      { ...base, id: "d", mencoes: ["3"] },
    ];
    expect(filtrarMensagens(ms, "duvidas", "3").map((m) => m.id)).toEqual(["b"]);
    expect(filtrarMensagens(ms, "mencoes", "3").map((m) => m.id)).toEqual(["d"]);
    expect(filtrarMensagens(ms, "tudo", "3")).toHaveLength(4);
  });
});
