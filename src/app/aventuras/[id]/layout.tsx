import { AoVivo } from "@/components/ao-vivo";
import { AbasAventura } from "@/components/aventura/abas-aventura";
import { Badge } from "@/components/ui/badge";
import { exigirMembro } from "@/lib/auth";
import { FASE_INFO } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";

export default async function AventuraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const { evento } = await carregarAventura(supabase, id);

  return (
    <div className="flex flex-col gap-5">
      <AoVivo
        canal={`aventura-${id}`}
        tabelas={[
          "events",
          "date_options",
          "date_reactions",
          "accommodations",
          "accommodation_reactions",
          "households",
          "attendances",
          "cost_items",
          "cost_weights",
          "cost_item_optins",
          "funds",
          "fund_transactions",
          "deposit_plans",
        ]}
      />
      <section>
        <p className="text-sm text-muted-foreground">Aventura · encontro</p>
        <h1 className="text-2xl font-bold text-wood">{evento.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={evento.phase === "cancelada" ? "destructive" : "gold"}>{FASE_INFO[evento.phase].nome}</Badge>
          {evento.start_date && evento.end_date && <span>{formatarPeriodo(evento.start_date, evento.end_date)}</span>}
          {evento.region && <span>· {evento.region}</span>}
        </div>
      </section>
      <AbasAventura id={id} souAdmin={pessoa.is_admin} />
      {children}
    </div>
  );
}
