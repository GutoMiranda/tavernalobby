import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Estalagem, Nucleo } from "./aventura-dados";
import { calcularMatriz, type Ponto } from "./rotas";
import { createAdminClient } from "./supabase/admin";
import type { Tempo } from "./viagem";

type Linha = Tempo & { origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number };

const mesmo = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Tempos de viagem de cada núcleo (com origem) até cada estalagem (com endereço) da aventura.
 * Calcula só os pares que faltam ou cujas coordenadas mudaram, e guarda no banco.
 */
export async function temposDeViagem(
  supabase: SupabaseClient,
  nucleos: Nucleo[],
  estalagens: Estalagem[],
): Promise<Tempo[]> {
  const origens: Ponto[] = nucleos
    .filter((n) => n.origin_lat != null && n.origin_lng != null)
    .map((n) => ({ id: n.id, lat: n.origin_lat!, lng: n.origin_lng! }));
  const destinos: Ponto[] = estalagens
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => ({ id: e.id, lat: e.lat!, lng: e.lng! }));
  if (origens.length === 0 || destinos.length === 0) return [];

  const { data } = await supabase
    .from("travel_times")
    .select(
      "household_id, accommodation_id, duration_seconds, distance_meters, origin_lat, origin_lng, dest_lat, dest_lng",
    )
    .in(
      "accommodation_id",
      destinos.map((d) => d.id),
    )
    .returns<Linha[]>();
  const guardados = data ?? [];

  const atual = (o: Ponto, d: Ponto) =>
    guardados.find(
      (t) =>
        t.household_id === o.id &&
        t.accommodation_id === d.id &&
        mesmo(t.origin_lat, o.lat) &&
        mesmo(t.origin_lng, o.lng) &&
        mesmo(t.dest_lat, d.lat) &&
        mesmo(t.dest_lng, d.lng),
    );

  const origensFaltando = origens.filter((o) => destinos.some((d) => !atual(o, d)));
  const destinosFaltando = destinos.filter((d) => origens.some((o) => !atual(o, d)));
  const admin = createAdminClient();

  if (admin && origensFaltando.length && destinosFaltando.length) {
    const calculados = await calcularMatriz(origensFaltando, destinosFaltando);
    const porId = <T extends { id: string }>(lista: T[], id: string) => lista.find((x) => x.id === id)!;
    const novos = calculados
      .filter((r) => !atual(porId(origens, r.origemId), porId(destinos, r.destinoId)))
      .map((r) => {
        const o = porId(origens, r.origemId);
        const d = porId(destinos, r.destinoId);
        return {
          household_id: o.id,
          accommodation_id: d.id,
          origin_lat: o.lat,
          origin_lng: o.lng,
          dest_lat: d.lat,
          dest_lng: d.lng,
          duration_seconds: r.segundos,
          distance_meters: r.metros,
          computed_at: new Date().toISOString(),
        };
      });
    if (novos.length) {
      await admin.from("travel_times").upsert(novos, { onConflict: "household_id,accommodation_id" });
      for (const n of novos) {
        const i = guardados.findIndex(
          (g) => g.household_id === n.household_id && g.accommodation_id === n.accommodation_id,
        );
        if (i >= 0) guardados[i] = n;
        else guardados.push(n);
      }
    }
  }

  return guardados.filter((t) => {
    const o = origens.find((x) => x.id === t.household_id);
    const d = destinos.find((x) => x.id === t.accommodation_id);
    return o && d && atual(o, d);
  });
}
