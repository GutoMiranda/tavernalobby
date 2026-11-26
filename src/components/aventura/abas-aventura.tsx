"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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

/** Abas da aventura como placas de madeira penduradas, com ícone, termo e palavra comum. */
export function AbasAventura({ id }: { id: string }) {
  const caminho = usePathname();
  const ativaRef = useRef<HTMLAnchorElement>(null);
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

  useEffect(() => {
    ativaRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [caminho]);

  return (
    <nav aria-label="Seções da aventura" className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2 pt-3 lg:grid lg:min-w-0 lg:grid-cols-8">
        {abas.map(({ href, rotulo, comum, Icone }) => {
          const ativa = href === base ? caminho === base : caminho.startsWith(href);
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
                ref={ativa ? ativaRef : undefined}
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "group flex w-[5.6rem] flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none lg:w-auto",
                  "bg-[linear-gradient(180deg,#3a2a1d,#2a1f17)] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-8px_rgb(0_0_0/0.8)]",
                  ativa
                    ? "-translate-y-0.5 border-gold text-wood shadow-[0_0_0_1px_var(--gold),0_0_24px_-6px_var(--gold)]"
                    : "border-[#4a3725] text-muted-foreground hover:-translate-y-0.5 hover:border-[#7a5a38] hover:text-foreground",
                )}
              >
                <Icone
                  className={cn(
                    "size-7 transition-transform duration-200 group-hover:scale-110",
                    ativa && "text-gold drop-shadow-[0_0_6px_rgb(242_165_65/0.6)]",
                  )}
                />
                <span className="font-display text-[0.95rem] leading-none font-semibold">{rotulo}</span>
                <span className="text-[0.68rem] leading-none opacity-75">{comum}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
