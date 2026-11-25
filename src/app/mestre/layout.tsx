import type { Metadata } from "next";

import { IconeCoroa } from "@/components/icones";
import { type AbaSalao, AbasSalao } from "@/components/mestre/abas-salao";
import { exigirSalao } from "@/lib/auth";

export const metadata: Metadata = { title: { template: "%s · Salão do Mestre", default: "Salão do Mestre" } };

/** Salão do Mestre: área separada para administrar. Cada pessoa vê só o que as tags dela liberam. */
export default async function SalaoLayout({ children }: { children: React.ReactNode }) {
  const { pessoa, permissoes } = await exigirSalao();
  const abas: AbaSalao[] = [
    { href: "/mestre", rotulo: "Painel", comum: "aventuras", exata: true },
    ...(permissoes.membros.ver ? [{ href: "/mestre/membros", rotulo: "Membros", comum: "aprovação" }] : []),
    ...(pessoa.is_admin ? [{ href: "/mestre/tags", rotulo: "Tags", comum: "permissões" }] : []),
  ];
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-[linear-gradient(135deg,#2c1f15,#1a130e)] px-5 py-4 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.5),0_10px_30px_-18px_var(--gold)]">
        <div className="flex items-center gap-3">
          <IconeCoroa className="size-10 shrink-0 text-gold drop-shadow-[0_0_8px_rgb(242_165_65/0.6)]" />
          <div>
            <h1 className="font-display text-2xl leading-tight font-bold text-wood sm:text-3xl">Salão do Mestre</h1>
            <p className="text-sm text-muted-foreground">
              {pessoa.is_admin
                ? "Administração da taverna · você é o Mestre e pode tudo."
                : "Administração · você vê aqui o que as suas tags liberam."}
            </p>
          </div>
        </div>
        <AbasSalao abas={abas} rotulo="Seções do Salão do Mestre" />
      </section>
      {children}
    </div>
  );
}
