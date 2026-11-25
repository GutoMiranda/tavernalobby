import type { Fase } from "@/lib/aventura";

/**
 * Imagens de fundo das fases da aventura, por link do Unsplash (Unsplash License: uso livre em sites,
 * sem custo; o Unsplash pede que as fotos sejam usadas pelo link deles). Se uma não carregar, o card
 * mostra a cena desenhada pelo site. Créditos abaixo e em public/cenas/CREDITOS.md.
 */
const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1280&q=70`;

export const FOTOS_DAS_FASES: Partial<Record<Fase, string>> = {
  datas: unsplash("photo-1641935519564-e1e0d6973646"),
  estalagens: unsplash("photo-1617062482502-f5e66f94265d"),
  presenca: unsplash("photo-1511138536578-d0ebc5578d7d"),
  preparativos: unsplash("photo-1622186477895-f2af6a0f5a97"),
  concluida: unsplash("photo-1761995912979-c3646524391b"),
  cancelada: unsplash("photo-1509384658642-3f88b1291b3d"),
};

export const CREDITOS_DAS_CENAS: Partial<Record<Fase, { autor: string; fonte: string; licenca: string }>> = {
  datas: {
    autor: "Melvin",
    fonte: "https://unsplash.com/photos/a-foggy-road-in-the-middle-of-a-forest-HwI__6D-BZc",
    licenca: "Unsplash License",
  },
  estalagens: {
    autor: "Ryu Orn",
    fonte: "https://unsplash.com/photos/people-sitting-on-chair-in-front-of-table-with-lighted-candles-6krylyiVV2w",
    licenca: "Unsplash License",
  },
  presenca: {
    autor: "Riley Sporle",
    fonte: "https://unsplash.com/photos/bonfire-during-nighttime-XHrq43cIss0",
    licenca: "Unsplash License",
  },
  preparativos: {
    autor: "Quilia",
    fonte: "https://unsplash.com/photos/silver-and-gold-round-coins-in-box-maJDOJSmMoo",
    licenca: "Unsplash License",
  },
  concluida: {
    autor: "Julien Riedel",
    fonte: "https://unsplash.com/photos/misty-mountain-peaks-at-sunrise-with-warm-light-sizw4cX8Sds",
    licenca: "Unsplash License",
  },
  cancelada: {
    autor: "Aldo De La Paz",
    fonte: "https://unsplash.com/photos/gray-concrete-structure-surrounded-by-green-trees-d6u2_u02FIo",
    licenca: "Unsplash License",
  },
};

export function fotoDaFase(fase: Fase): string | null {
  return FOTOS_DAS_FASES[fase] ?? null;
}

export function fotosDasFases(): Partial<Record<Fase, string>> {
  return FOTOS_DAS_FASES;
}
