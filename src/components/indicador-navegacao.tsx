"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { FRASES_CARREGANDO } from "@/lib/frases-carregando";

/**
 * Resposta imediata ao clicar num link interno: barra dourada correndo no topo e, se a página demorar,
 * um aviso com o dado rolando e uma frase de RPG. Some quando a nova página chega (ou em 15 s).
 * Escuta na captura, antes do Link do Next cancelar o clique padrão.
 */
export function IndicadorNavegacao() {
  const caminho = usePathname();
  const [indo, setIndo] = useState(false);
  const [demorando, setDemorando] = useState(false);
  const [frase, setFrase] = useState(0);

  useEffect(() => {
    setIndo(false);
    setDemorando(false);
  }, [caminho]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      setFrase(Math.floor(Math.random() * FRASES_CARREGANDO.length));
      setIndo(true);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  useEffect(() => {
    if (!indo) return;
    const aviso = setTimeout(() => setDemorando(true), 450);
    const limite = setTimeout(() => setIndo(false), 15000);
    return () => {
      clearTimeout(aviso);
      clearTimeout(limite);
    };
  }, [indo]);

  if (!indo) return null;
  return (
    <>
      <div aria-hidden className="barra-navegacao fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-gold/20">
        <span className="block h-full w-1/3 bg-gold shadow-[0_0_10px_var(--gold)]" />
      </div>
      {demorando && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div
            role="status"
            className="flex w-[min(92vw,24rem)] flex-col items-center gap-2 rounded-2xl border border-gold/50 bg-[#1d1611] px-6 py-6 text-center text-parchment shadow-[0_18px_40px_-12px_black]"
          >
            <svg viewBox="-14 -14 28 28" className="dado-rolando size-16 shrink-0" aria-hidden>
              <polygon
                points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
                fill="#f2a541"
                stroke="#4a240b"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M0 -6.6 L-5.8 3.6 H5.8 Z M0 -12 L0 -6.6 M10.4 -6 L0 -6.6 M-10.4 -6 L0 -6.6 M0 12 L5.8 3.6 M0 12 L-5.8 3.6"
                fill="none"
                stroke="#4a240b"
                strokeWidth="0.8"
              />
            </svg>
            <span className="text-xs tracking-[0.25em] text-gold uppercase">Abrindo…</span>
            <span className="font-display text-xl leading-snug">{FRASES_CARREGANDO[frase]}</span>
          </div>
        </div>
      )}
    </>
  );
}
