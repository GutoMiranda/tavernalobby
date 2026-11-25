"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado compartilhado do chat no navegador: quem está online (Supabase Presence, mantido pelo painel
 * do cabeçalho) e pedidos para abrir o painel (ex.: "Mencionar" na lista de quem está na taverna).
 */
type Estado = { online: ReadonlySet<string>; aberto: boolean; rascunho: { texto: string; n: number } | null };

let estado: Estado = { online: new Set(), aberto: false, rascunho: null };
const ouvintes = new Set<() => void>();

function mudar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  for (const o of ouvintes) o();
}

export const chatStore = {
  definirOnline: (ids: Iterable<string>) => mudar({ online: new Set(ids) }),
  abrir: () => mudar({ aberto: true }),
  fechar: () => mudar({ aberto: false }),
  /** Abre o painel com um texto no campo (ex.: "@Bia "). */
  escreverPara: (texto: string) => mudar({ aberto: true, rascunho: { texto, n: (estado.rascunho?.n ?? 0) + 1 } }),
};

function assinar(cb: () => void) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

const VAZIO: Estado = { online: new Set(), aberto: false, rascunho: null };

export function useChatStore(): Estado {
  return useSyncExternalStore(
    assinar,
    () => estado,
    () => VAZIO,
  );
}
