import { describe, expect, it } from "vitest";

import {
  AREAS,
  areasVisiveis,
  entraNoSalao,
  lerPermissoes,
  normalizarPermissao,
  pode,
  semPermissoes,
  todasPermissoes,
} from "./permissoes";

describe("permissões por aba", () => {
  it("lê as linhas do banco e ignora área desconhecida", () => {
    const p = lerPermissoes([
      { area: "bau", ver: true, editar: true, excluir: false },
      { area: "inexistente", ver: true, editar: true, excluir: true },
    ]);
    expect(p.bau).toEqual({ ver: true, editar: true, excluir: false });
    expect(pode(p, "bau", "excluir")).toBe(false);
    expect(pode(p, "custos", "ver")).toBe(false);
    expect(Object.keys(p)).toEqual([...AREAS]);
  });

  it("sem linhas, nada liberado; Mestre tem tudo", () => {
    expect(lerPermissoes(null)).toEqual(semPermissoes());
    expect(areasVisiveis(todasPermissoes())).toEqual([...AREAS]);
  });

  it("entra no Salão quem é Mestre ou vê alguma área", () => {
    expect(entraNoSalao(semPermissoes(), false)).toBe(false);
    expect(entraNoSalao(semPermissoes(), true)).toBe(true);
    const p = lerPermissoes([{ area: "armazem", ver: true, editar: false, excluir: false }]);
    expect(entraNoSalao(p, false)).toBe(true);
    expect(areasVisiveis(p)).toEqual(["armazem"]);
  });

  it("editar ou excluir sempre levam o ver junto", () => {
    expect(normalizarPermissao(false, true, false)).toEqual({ ver: true, editar: true, excluir: false });
    expect(normalizarPermissao(false, false, true)).toEqual({ ver: true, editar: false, excluir: true });
    expect(normalizarPermissao(false, false, false)).toEqual({ ver: false, editar: false, excluir: false });
  });
});
