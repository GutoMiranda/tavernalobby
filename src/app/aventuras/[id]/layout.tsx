import { AoVivo } from "@/components/ao-vivo";
import { AbasAventura } from "@/components/aventura/abas-aventura";
import { CENA_DA_FASE, CenaQuest, MOLDURA_DA_FASE } from "@/components/cena-quest";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { FASE_INFO } from "@/lib/aventura";
import { fotoDaFase } from "@/lib/cenas";
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
  const { supabase } = await exigirMembro();
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
          "pix_checkouts",
          "pantry_items",
        ]}
      />
      <Card moldura={MOLDURA_DA_FASE[evento.phase]} className="overflow-hidden py-0">
        <div className="relative isolate flex min-h-40 flex-col items-center justify-center gap-1.5 px-6 py-6 text-center">
          <div className="absolute inset-0 -z-10 opacity-95">
            <CenaQuest cena={CENA_DA_FASE[evento.phase]} idBase={`banner-${id}`} foto={fotoDaFase(evento.phase)} />
          </div>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(18_13_9/0.7)_0%,rgb(18_13_9/0.35)_50%,transparent_85%)]" />
          <p className="text-sm tracking-widest text-parchment/80 uppercase">Aventura · encontro</p>
          <h1 className="text-3xl font-bold text-wood drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)] sm:text-4xl">
            {evento.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-parchment">
            <Badge variant={evento.phase === "cancelada" ? "destructive" : "gold"}>
              {FASE_INFO[evento.phase].nome}
            </Badge>
            {evento.start_date && evento.end_date && <span>{formatarPeriodo(evento.start_date, evento.end_date)}</span>}
            {evento.region && <span>· {evento.region}</span>}
          </div>
        </div>
      </Card>
      <AbasAventura id={id} />
      {children}
    </div>
  );
}
