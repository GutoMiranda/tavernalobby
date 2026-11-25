import type { Fase } from "@/lib/aventura";

/**
 * Imagens de fundo das fases da aventura (arquivos em public/cenas/), escolhidas pelo dono em bancos
 * gratuitos (Unsplash, Pexels, Pixabay) ou obras em domínio público. Fase sem imagem usa a cena
 * desenhada pelo site. Créditos ficam em CREDITOS_DAS_CENAS e em public/cenas/CREDITOS.md.
 */
export const FOTOS_DAS_FASES: Partial<Record<Fase, string>> = {};

export const CREDITOS_DAS_CENAS: Partial<Record<Fase, { autor: string; fonte: string; licenca: string }>> = {};

export function fotoDaFase(fase: Fase): string | null {
  return FOTOS_DAS_FASES[fase] ?? null;
}

export function fotosDasFases(): Partial<Record<Fase, string>> {
  return FOTOS_DAS_FASES;
}
