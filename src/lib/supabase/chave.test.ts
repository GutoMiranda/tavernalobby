import { describe, expect, it } from "vitest";

import { chaveSecretaValida } from "./chave";

const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.y`;

describe("chaveSecretaValida", () => {
  it("aceita a chave secreta e recusa a pública", () => {
    expect(chaveSecretaValida(jwt("service_role"))).toBe(true);
    expect(chaveSecretaValida(jwt("anon"))).toBe(false);
    expect(chaveSecretaValida("sb_secret_abc")).toBe(true);
    expect(chaveSecretaValida("sb_publishable_abc")).toBe(false);
    expect(chaveSecretaValida("lixo")).toBe(false);
  });
});
