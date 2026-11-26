"use client";

import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconeCaneca, IconeCoroa, IconeD20, IconeEscudo } from "@/components/icones";
import { cn } from "@/lib/utils";

/** Menu fixo no rodapé do celular (como num app): tudo à vista, sem rolar para o lado. */
export function MenuInferior({ salao }: { salao: boolean }) {
  const caminho = usePathname();
  const itens = [
    { href: "/", rotulo: "Taverna", Icone: IconeCaneca },
    { href: "/aventuras", rotulo: "Aventuras", Icone: IconeD20 },
    { href: "/chat", rotulo: "Chat", Icone: MessagesSquare },
    { href: "/familia", rotulo: "Família", Icone: IconeEscudo },
    ...(salao ? [{ href: "/mestre", rotulo: "Mestre", Icone: IconeCoroa }] : []),
  ];
  return (
    <nav
      aria-label="Menu principal"
      className="bg-madeira fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.9)] sm:hidden"
    >
      <ul className="flex">
        {itens.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none focus-visible:ring-inset",
                  ativo ? "text-gold" : "text-parchment/75",
                )}
              >
                <Icone className={cn("size-6", ativo && "drop-shadow-[0_0_6px_rgb(242_165_65/0.6)]")} aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
