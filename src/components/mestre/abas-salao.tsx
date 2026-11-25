"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type AbaSalao = { href: string; rotulo: string; comum: string; exata?: boolean };

/** Abas do Salão do Mestre (e das áreas de uma aventura dentro dele). */
export function AbasSalao({ abas, rotulo }: { abas: AbaSalao[]; rotulo: string }) {
  const caminho = usePathname();
  return (
    <nav aria-label={rotulo} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {abas.map((a) => {
          const ativa = a.exata ? caminho === a.href : caminho === a.href || caminho.startsWith(`${a.href}/`);
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-lg border px-3.5 py-1.5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                  ativa
                    ? "border-gold bg-gold/15 text-wood shadow-[0_0_18px_-8px_var(--gold)]"
                    : "border-[#4a3725] bg-black/20 text-muted-foreground hover:border-[#7a5a38] hover:text-foreground",
                )}
              >
                <span className="font-display text-base leading-tight font-semibold">{a.rotulo}</span>
                <span className="text-[0.7rem] leading-none opacity-75">{a.comum}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
