"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AbasAventura({ id, souAdmin }: { id: string; souAdmin: boolean }) {
  const caminho = usePathname();
  const base = `/aventuras/${id}`;
  const abas = [
    { href: base, rotulo: "Painel" },
    { href: `${base}/geral`, rotulo: "Geral · rotas" },
    { href: `${base}/datas`, rotulo: "Datas" },
    { href: `${base}/estalagens`, rotulo: "Estalagens" },
    { href: `${base}/presenca`, rotulo: "Presença" },
    { href: `${base}/custos`, rotulo: "Custos" },
    { href: `${base}/bau`, rotulo: "Baú" },
    ...(souAdmin ? [{ href: `${base}/editar`, rotulo: "Editar" }] : []),
  ];
  return (
    <nav aria-label="Seções da aventura" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-border">
        {abas.map((a) => {
          const ativa = a.href === base ? caminho === base : caminho.startsWith(a.href);
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  ativa
                    ? "border-bottle text-bottle"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {a.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
