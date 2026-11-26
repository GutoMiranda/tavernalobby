import type { Area, Permissoes } from "@/lib/permissoes";

/** Abas de uma aventura dentro do Salão do Mestre (Armazém e Chat se gerenciam direto nas próprias telas). */
export const AREAS_DA_AVENTURA = [
  { area: "aventura", slug: "aventura", rotulo: "Aventura", comum: "dados e fase" },
  { area: "datas", slug: "datas", rotulo: "Datas", comum: "votação" },
  { area: "estalagens", slug: "estalagens", rotulo: "Estalagens", comum: "hospedagem" },
  { area: "presenca", slug: "presenca", rotulo: "Presença", comum: "quem vai" },
  { area: "custos", slug: "custos", rotulo: "Custos", comum: "divisão" },
  { area: "bau", slug: "bau", rotulo: "Baú", comum: "caixinha" },
] as const satisfies readonly { area: Area; slug: string; rotulo: string; comum: string }[];

export function primeiraAreaDaAventura(p: Permissoes): string | null {
  return AREAS_DA_AVENTURA.find((a) => p[a.area].ver)?.slug ?? null;
}
