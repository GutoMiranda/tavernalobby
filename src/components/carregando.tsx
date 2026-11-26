"use client";

import { useEffect, useState } from "react";

import { FRASES_CARREGANDO, proximaFrase } from "@/lib/frases-carregando";
import { cn } from "@/lib/utils";

/** d20 que gira e quica enquanto carrega (para com "reduzir movimento"). */
function DadoRolando({ className }: { className?: string }) {
  return (
    <svg viewBox="-14 -14 28 28" className={cn("dado-rolando", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id="carregando-ouro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe2a0" />
          <stop offset="0.45" stopColor="#f2a541" />
          <stop offset="1" stopColor="#9a4f14" />
        </linearGradient>
      </defs>
      <polygon
        points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
        fill="url(#carregando-ouro)"
        stroke="#4a240b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M0 -6.6 L-5.8 3.6 H5.8 Z M0 -12 L0 -6.6 M10.4 -6 L0 -6.6 M10.4 -6 L5.8 3.6 M10.4 6 L5.8 3.6 M0 12 L5.8 3.6 M0 12 L-5.8 3.6 M-10.4 6 L-5.8 3.6 M-10.4 -6 L-5.8 3.6 M-10.4 -6 L0 -6.6"
        fill="none"
        stroke="#4a240b"
        strokeWidth="0.8"
        opacity="0.75"
      />
      <text x="0" y="1.9" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#3a1a06" className="font-display">
        20
      </text>
    </svg>
  );
}

/**
 * Tela de carregamento: dado rolando, frase de sátira de RPG que troca a cada 2,6 s e barra animada.
 * `compacto` é a versão dentro da aventura (troca de aba), sem ocupar a tela toda.
 */
export function Carregando({ compacto = false }: { compacto?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(Math.floor(Math.random() * FRASES_CARREGANDO.length));
    const t = setInterval(() => setI((atual) => proximaFrase(atual, Math.random())), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center",
        compacto ? "py-10" : "min-h-[50vh] justify-center py-12",
      )}
    >
      <div className="relative grid place-items-center">
        <span
          aria-hidden
          className="absolute size-28 rounded-full bg-[radial-gradient(circle,rgb(242_165_65/0.35),transparent_70%)] blur-sm"
        />
        <DadoRolando className={compacto ? "size-16" : "size-20"} />
        <span aria-hidden className="dado-sombra mt-1 h-2 w-12 rounded-full bg-black/50 blur-[2px]" />
      </div>
      <p className="font-display text-sm tracking-[0.25em] text-gold uppercase">Carregando</p>
      <p
        key={i}
        className="frase-carregando min-h-[3.5rem] font-display text-xl leading-snug text-parchment sm:text-2xl"
      >
        {FRASES_CARREGANDO[i]}
      </p>
      <div aria-hidden className="barra-carregando h-1.5 w-48 overflow-hidden rounded-full bg-gold/15">
        <span className="block h-full w-1/3 rounded-full bg-gold" />
      </div>
    </div>
  );
}
