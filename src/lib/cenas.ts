import type { Fase } from "@/lib/aventura";

/**
 * Imagens de fundo das fases da aventura, por link do Unsplash (Unsplash License: uso livre em sites,
 * sem custo; o Unsplash pede que as fotos sejam usadas pelo link deles). Se uma não carregar, o card
 * mostra a cena desenhada pelo site. Créditos abaixo e em public/cenas/CREDITOS.md.
 */
export const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1280&q=70`;

// Vazio até o dono escolher as imagens (decisão 86). Formato: { datas: unsplash("photo-..."), ... }.
export const FOTOS_DAS_FASES: Partial<Record<Fase, string>> = {};

export const CREDITOS_DAS_CENAS: Partial<Record<Fase, { autor: string; fonte: string; licenca: string }>> = {};

export function fotoDaFase(fase: Fase): string | null {
  return FOTOS_DAS_FASES[fase] ?? null;
}

export function fotosDasFases(): Partial<Record<Fase, string>> {
  return FOTOS_DAS_FASES;
}
