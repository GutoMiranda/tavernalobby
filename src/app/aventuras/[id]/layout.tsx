import { AoVivo } from "@/components/ao-vivo";
import { AbasAventura } from "@/components/aventura/abas-aventura";
import { BotoesAgenda } from "@/components/aventura/botoes-agenda";
import { CENA_DA_FASE, CenaQuest, MOLDURA_DA_FASE } from "@/components/cena-quest";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type DestinoDaViagem, GavetaPassagens, type LugarDaViagem } from "@/components/passagens/gaveta-passagens";
import { exigirMembro } from "@/lib/auth";
import { contagemRegressiva, FASE_INFO, periodoEfetivo, ranking } from "@/lib/aventura";
import { fotoDaFase } from "@/lib/cenas";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";
import { cidadeDoEndereco } from "@/lib/passagens";

export default async function AventuraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;
  const meuNucleo = dados.nucleos.find((n) => n.id === pessoa.household_id);
  const periodo = periodoEfetivo(evento, dados.datas, dados.reacoesDatas);
  const contagem = contagemRegressiva(evento.start_date);

  // Destino das passagens: a estalagem definida; sem ela, a mais votada com endereço (prévia); senão, a região.
  const comEndereco = dados.estalagens.filter((e) => e.lat != null && e.lng != null);
  const definida = comEndereco.find((e) => e.id === evento.chosen_accommodation_id);
  const alvo =
    definida ?? (evento.chosen_accommodation_id ? undefined : ranking(comEndereco, dados.reacoesEstalagens)[0]);
  const destino: DestinoDaViagem | null = alvo
    ? {
        nome: alvo.name,
        cidade: cidadeDoEndereco(alvo.address) ?? evento.region,
        lat: alvo.lat,
        lng: alvo.lng,
        fonte: definida ? "definida" : "mais_votada",
      }
    : evento.region
      ? { nome: evento.region, cidade: evento.region, lat: null, lng: null, fonte: "regiao" }
      : null;
  const lugar = (n: (typeof dados.nucleos)[number]): LugarDaViagem => ({
    nome: n.name,
    cidade: n.origin_text ? (cidadeDoEndereco(n.origin_text) ?? n.origin_text) : null,
    lat: n.origin_lat,
    lng: n.origin_lng,
  });

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
      <Card moldura={MOLDURA_DA_FASE[evento.phase]} tom="escuro" className="overflow-hidden py-0">
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
            <span>
              {[
                evento.start_date && evento.end_date ? formatarPeriodo(evento.start_date, evento.end_date) : null,
                evento.region,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {contagem && evento.phase !== "cancelada" && (
            <p className="mt-1 rounded-full border border-gold/50 bg-black/40 px-3 py-0.5 font-display text-lg text-gold">
              {contagem}
            </p>
          )}
        </div>
      </Card>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {evento.start_date && evento.end_date && (
          <BotoesAgenda
            ics={`/aventuras/${id}/agenda`}
            evento={{
              titulo: evento.name,
              inicio: evento.start_date,
              fim: evento.end_date,
              local: definida
                ? [definida.name, definida.address].filter(Boolean).join(", ")
                : (dados.pontos[0]?.address ?? evento.region),
              descricao: `Aventura da Taverna O Lobby: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/aventuras/${id}`,
            }}
          />
        )}
        <GavetaPassagens
          destino={destino}
          meuNucleo={meuNucleo ? lugar(meuNucleo) : null}
          nucleos={dados.nucleos.map(lugar)}
          idaInicial={periodo?.inicio ?? null}
          voltaInicial={periodo?.fim ?? null}
          periodoPrevia={periodo?.fonte === "mais_votada"}
        />
      </div>
      <AbasAventura id={id} />
      {children}
    </div>
  );
}
