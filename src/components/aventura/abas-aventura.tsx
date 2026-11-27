"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  IconeBalanca,
  IconeBau,
  IconeEscudo,
  IconeEstalagem,
  IconeEstandarte,
  IconeMantimentos,
  IconeMapa,
  IconePergaminho,
} from "@/components/icones";
import { cn } from "@/lib/utils";

/**
 * Abas da aventura como placas de madeira penduradas, com ícone, termo e palavra comum.
 * No celular ficam em grade de 4 × 2 (todas à vista, sem rolar para o lado).
 */
export function AbasAventura({ id }: { id: string }) {
  const caminho = usePathname();
  // A aba tocada acende na hora; o conteúdo carrega embaixo com banner e abas parados.
  const [tocada, setTocada] = useState<string | null>(null);
  useEffect(() => setTocada(null), [caminho]);
  const base = `/aventuras/${id}`;
  const abas = [
    { href: base, rotulo: "Painel", comum: "resumo", Icone: IconeEstandarte },
    { href: `${base}/geral`, rotulo: "Mapa", comum: "rotas", Icone: IconeMapa },
    { href: `${base}/datas`, rotulo: "Datas", comum: "votação", Icone: IconePergaminho },
    { href: `${base}/estalagens`, rotulo: "Estalagens", comum: "hospedagem", Icone: IconeEstalagem },
    { href: `${base}/presenca`, rotulo: "Presença", comum: "quem vai", Icone: IconeEscudo },
    { href: `${base}/armazem`, rotulo: "Armazém", comum: "compras", Icone: IconeMantimentos },
    { href: `${base}/custos`, rotulo: "Custos", comum: "divisão", Icone: IconeBalanca },
    { href: `${base}/bau`, rotulo: "Baú", comum: "caixinha", Icone: IconeBau },
  ];

  return (
    <nav aria-label="Seções da aventura" className="pb-1">
      <ul className="grid grid-cols-4 gap-x-1.5 gap-y-4 pt-3 sm:grid-cols-8 sm:gap-2">
        {abas.map(({ href, rotulo, comum, Icone }) => {
          const ativa = tocada ? tocada === href : href === base ? caminho === base : caminho.startsWith(href);
          return (
            <li key={href} className="relative">
              {/* Correntinhas da placa */}
              <span
                aria-hidden
                className="absolute -top-3 left-1/4 h-3 w-px bg-gradient-to-b from-transparent to-[#8a6a45]"
              />
              <span
                aria-hidden
                className="absolute -top-3 right-1/4 h-3 w-px bg-gradient-to-b from-transparent to-[#8a6a45]"
              />
              <Link
                href={href}
                data-navegacao="leve"
                onClick={() => setTocada(href)}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "group flex h-full min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none sm:px-2 sm:py-2.5",
                  "bg-[linear-gradient(180deg,#3a2a1d,#2a1f17)] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-8px_rgb(0_0_0/0.8)]",
                  ativa
                    ? "-translate-y-0.5 border-gold text-wood shadow-[0_0_0_1px_var(--gold),0_0_24px_-6px_var(--gold)]"
                    : "border-[#4a3725] text-muted-foreground hover:-translate-y-0.5 hover:border-[#7a5a38] hover:text-foreground",
                )}
              >
                <Icone
                  className={cn(
                    "size-6 transition-transform duration-200 group-hover:scale-110 sm:size-7",
                    ativa && "text-gold drop-shadow-[0_0_6px_rgb(242_165_65/0.6)]",
                  )}
                />
                <span className="max-w-full truncate font-display text-[0.8rem] leading-none font-semibold min-[400px]:text-[0.88rem] sm:text-[0.95rem]">
                  {rotulo}
                </span>
                <span className="max-w-full truncate text-[0.62rem] leading-none opacity-75 sm:text-[0.68rem]">
                  {comum}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
