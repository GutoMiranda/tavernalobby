import { describe, expect, it } from "vitest";

import { resumirPassos, textoDaRota } from "./transporte";

const linha = (tipo: string, curto: string, nome: string, de: string, para: string, paradas: number) => ({
  travelMode: "TRANSIT",
  staticDuration: "600s",
  transitDetails: {
    stopDetails: { departureStop: { name: de }, arrivalStop: { name: para } },
    headsign: nome,
    stopCount: paradas,
    localizedValues: { departureTime: { time: { text: "15:49" } } },
    transitLine: { nameShort: curto, color: "#0455A1", vehicle: { type: tipo } },
  },
});

describe("Passo a passo do transporte público", () => {
  it("junta caminhadas seguidas, descarta as curtas e traduz o veículo", () => {
    const passos = resumirPassos([
      { travelMode: "WALK", staticDuration: "200s" },
      { travelMode: "WALK", staticDuration: "220s" },
      linha("SUBWAY", "Linha 1", "Jabaquara", "Portuguesa-Tietê", "Luz", 3),
      { travelMode: "WALK", staticDuration: "30s" },
      linha("HEAVY_RAIL", "Linha 10", "Rio Grande da Serra", "Luz", "Ribeirão Pires", 12),
      linha("BUS", "381", "Baruel-Vila Fátima", "Rua Capitão José Galo, 85", "Jardim Ikeda", 44),
    ]);
    expect(passos.map((p) => (p.tipo === "a_pe" ? `a pé ${p.segundos}` : `${p.veiculo} ${p.linha}`))).toEqual([
      "a pé 420",
      "Metrô Linha 1",
      "Trem Linha 10",
      "Ônibus 381",
    ]);
  });

  it("monta o texto para compartilhar com as linhas e o link", () => {
    const passos = resumirPassos([linha("BUS", "381", "Vila Fátima", "Centro", "Ikeda", 44)]);
    const t = textoDaRota({ de: "Tietê", para: "Chácara", modo: "Ônibus / metrô", segundos: 6540, passos, link: "L" });
    expect(t).toContain("cerca de 1h49");
    expect(t).toContain("1. Ônibus 381 (sentido Vila Fátima): de Centro até Ikeda, 44 paradas");
    expect(t.endsWith("Abrir no Google Maps: L")).toBe(true);
  });
});
