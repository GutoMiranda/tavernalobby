"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Gaveta lateral (mesmo modelo do chat): desliza da direita, tela cheia no celular, fecha com Esc,
 * no X ou tocando fora. Para telas leves (avisos, personagem) sem trocar de página.
 */
export function Gaveta({
  id,
  titulo,
  aberta,
  onFechar,
  children,
  rodape,
}: {
  id: string;
  titulo: React.ReactNode;
  aberta: boolean;
  onFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, onFechar]);

  if (!montado) return null;
  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onFechar}
        className={cn(
          "fixed inset-0 z-[55] bg-black/50 transition-opacity lg:bg-black/20",
          aberta ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id={id}
        role="dialog"
        aria-modal="false"
        aria-label={typeof titulo === "string" ? titulo : undefined}
        aria-hidden={!aberta}
        inert={!aberta}
        className={cn(
          "fixed inset-y-0 right-0 z-[56] flex w-full flex-col border-l-2 border-gold/50 bg-[#1b1511] shadow-[-20px_0_40px_-10px_rgb(0_0_0/0.8)] transition-transform duration-300 sm:w-[26rem]",
          aberta ? "translate-x-0" : "translate-x-full",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="bg-madeira flex items-center gap-2 border-b border-gold/40 px-4 py-3">
          <h2 className="flex-1 font-display text-xl text-wood">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-parchment hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {rodape && <div className="border-t border-border bg-black/20 p-3">{rodape}</div>}
      </aside>
    </>,
    document.body,
  );
}
