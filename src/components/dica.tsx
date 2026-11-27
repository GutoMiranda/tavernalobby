"use client";

import { CircleHelp } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Posicao = { left: number; width: number; top?: number; bottom?: number };

/**
 * Dica rápida num "?": abre ao passar o mouse (computador), ao tocar (celular) ou ao focar pelo teclado.
 * Tocar/clicar deixa aberta até tocar fora ou apertar Esc. O balão vai para o fim da página (portal),
 * para não herdar a fonte do título nem ser cortado pelo card.
 */
export function Dica({
  children,
  rotulo = "Dica",
  className,
}: {
  children: React.ReactNode;
  /** Texto para leitor de tela do botão. */
  rotulo?: string;
  className?: string;
}) {
  const id = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const [aberta, setAberta] = useState(false);
  const [fixa, setFixa] = useState(false);
  const [pos, setPos] = useState<Posicao | null>(null);

  const posicionar = useCallback(() => {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
    // Perto do rodapé (ou da barra de baixo no celular), abre para cima.
    setPos(
      r.bottom + 180 > window.innerHeight
        ? { left, width, bottom: window.innerHeight - r.top + 6 }
        : { left, width, top: r.bottom + 6 },
    );
  }, []);

  const abrir = useCallback(() => {
    posicionar();
    setAberta(true);
  }, [posicionar]);
  const fechar = useCallback(() => {
    setAberta(false);
    setFixa(false);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    const fora = (e: PointerEvent) => {
      if (!botao.current?.contains(e.target as Node)) fechar();
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", fechar, { passive: true, capture: true });
    window.addEventListener("resize", fechar);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", fechar, { capture: true });
      window.removeEventListener("resize", fechar);
    };
  }, [aberta, fechar]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={rotulo}
        aria-describedby={aberta ? id : undefined}
        aria-expanded={aberta}
        onPointerEnter={(e) => e.pointerType === "mouse" && abrir()}
        onPointerLeave={(e) => e.pointerType === "mouse" && !fixa && setAberta(false)}
        onFocus={abrir}
        onBlur={() => !fixa && setAberta(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (fixa) fechar();
          else {
            abrir();
            setFixa(true);
          }
        }}
        className={cn(
          "inline-grid size-6 shrink-0 cursor-help place-items-center rounded-full align-middle text-bottle/80 transition-colors hover:bg-bottle/10 hover:text-bottle focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
          className,
        )}
      >
        <CircleHelp className="!size-4" aria-hidden />
      </button>
      {aberta &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            className="pointer-events-none fixed z-[70] rounded-lg border border-gold/50 bg-[#2a1f17] px-3 py-2 text-left font-sans text-sm leading-relaxed font-normal text-[#f3e6cf] shadow-[0_12px_30px_-10px_black]"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
