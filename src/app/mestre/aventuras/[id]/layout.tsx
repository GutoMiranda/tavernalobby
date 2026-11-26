import { Eye } from "lucide-react";
import Link from "next/link";

import { AoVivo } from "@/components/ao-vivo";
import { AbasSalao } from "@/components/mestre/abas-salao";
import { Badge } from "@/components/ui/badge";
import { exigirSalao } from "@/lib/auth";
import { FASE_INFO } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";

import { AREAS_DA_AVENTURA } from "../../areas";

/** Uma aventura dentro do Salão do Mestre: só as abas que a pessoa pode ver. */
export default async function SalaoAventuraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, permissoes } = await exigirSalao();
  const { evento } = await carregarAventura(supabase, id);
  const base = `/mestre/aventuras/${id}`;
  const abas = AREAS_DA_AVENTURA.filter((a) => permissoes[a.area].ver).map((a) => ({
    href: `${base}/${a.slug}`,
    rotulo: a.rotulo,
    comum: a.comum,
  }));

  return (
    <div className="flex flex-col gap-4">
      <AoVivo
        canal={`salao-${id}`}
        tabelas={[
          "events",
          "date_options",
          "date_reactions",
          "accommodations",
          "accommodation_reactions",
          "attendances",
          "cost_items",
          "cost_weights",
          "cost_item_optins",
          "funds",
          "fund_transactions",
          "pix_checkouts",
        ]}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-semibold text-wood">{evento.name}</h2>
        <Badge variant={evento.phase === "cancelada" ? "destructive" : "gold"}>{FASE_INFO[evento.phase].nome}</Badge>
        {evento.start_date && evento.end_date && (
          <span className="text-muted-foreground">{formatarPeriodo(evento.start_date, evento.end_date)}</span>
        )}
        <Link
          href={`/aventuras/${id}`}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-parchment"
        >
          <Eye className="size-4" aria-hidden /> Ver como membro
        </Link>
      </div>
      <AbasSalao abas={abas} rotulo="Abas da aventura no Salão" />
      {children}
    </div>
  );
}
