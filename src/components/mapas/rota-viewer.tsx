"use client";

import { Bike, Bus, Car, ExternalLink, Footprints } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ModoRota, RotaResumo } from "@/lib/rotas";
import { textoDaRota } from "@/lib/transporte";
import { cn } from "@/lib/utils";
import { formatarDistancia, formatarDuracao, linkGoogleMaps, linkMapaEmbutido, type ModoMapa } from "@/lib/viagem";

import { CHAVE_MAPS } from "./chave";
import { CompartilharRota } from "./compartilhar-rota";
import { TransporteNaHora } from "./transporte-na-hora";

const MODOS: { id: ModoMapa; rotulo: string; icone: typeof Car }[] = [
  { id: "carro", rotulo: "Carro", icone: Car },
  { id: "moto", rotulo: "Moto", icone: Bike },
  { id: "transporte", rotulo: "Ônibus / metrô", icone: Bus },
  { id: "a_pe", rotulo: "A pé", icone: Footprints },
];

type Ponto = { lat: number; lng: number; nome?: string };
const MODO_DA_API: Record<ModoMapa, ModoRota> = {
  carro: "DRIVE",
  moto: "TWO_WHEELER",
  transporte: "TRANSIT",
  a_pe: "WALK",
};

/** Rota no Google Maps embutido, com troca de modo e botão para abrir no app do Maps. */
export function RotaViewer({
  origem,
  destino,
  resumo = [],
}: {
  origem: Ponto;
  destino: Ponto;
  /** Tempos e passos calculados no servidor (para o passo a passo e o compartilhar). */
  resumo?: RotaResumo[];
}) {
  // Só os meios com rota; sem nenhum tempo calculado (ex.: sem chave do Google), mostra todos.
  const comRota = MODOS.filter((m) => resumo.find((r) => r.modo === MODO_DA_API[m.id])?.segundos != null);
  const visiveis = comRota.length > 0 ? comRota : MODOS;
  const [modo, setModo] = useState<ModoMapa>(visiveis[0].id);
  const rota = resumo.find((r) => r.modo === MODO_DA_API[modo]);
  const link = linkGoogleMaps(origem, destino, modo);
  const rotulo = MODOS.find((m) => m.id === modo)?.rotulo ?? "";
  const semRota = MODOS.filter((m) => !visiveis.includes(m)).map((m) => m.rotulo.toLowerCase());

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Como ir" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visiveis.map(({ id, rotulo, icone: Icone }) => {
          const r = resumo.find((x) => x.modo === MODO_DA_API[id]);
          const ativo = modo === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => setModo(id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-muted",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm">
                <Icone className="size-4" aria-hidden /> {rotulo}
              </span>
              {r?.segundos != null && (
                <>
                  <span className="text-lg font-semibold">{formatarDuracao(r.segundos)}</span>
                  <span className={cn("text-xs", ativo ? "opacity-85" : "text-muted-foreground")}>
                    {r.metros != null && formatarDistancia(r.metros)}
                    {r.segundosSemTransito != null &&
                      r.segundos - r.segundosSemTransito > 300 &&
                      ` · +${formatarDuracao(r.segundos - r.segundosSemTransito)} de trânsito`}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {comRota.length > 0 && semRota.length > 0 && (
        <p className="text-xs text-muted-foreground">Sem rota do Google para: {semRota.join(", ")}.</p>
      )}
      {resumo.find((r) => r.erro) && (
        <p className="text-sm break-words text-alert">
          O Google recusou parte do cálculo: {resumo.find((r) => r.erro)?.erro}
        </p>
      )}
      {modo === "moto" && (
        <p className="text-sm text-muted-foreground">
          O mapa embutido mostra a rota de carro; o tempo acima é o de moto.
        </p>
      )}
      {modo === "transporte" && (
        <TransporteNaHora
          key={`${origem.lat},${origem.lng}>${destino.lat},${destino.lng}`}
          origem={origem}
          destino={destino}
          nomeDe={origem.nome ?? "a saída"}
          nomePara={destino.nome ?? "o destino"}
          link={link}
        />
      )}
      {CHAVE_MAPS ? (
        <iframe
          key={modo}
          title={`Rota no Google Maps (${MODOS.find((m) => m.id === modo)?.rotulo})`}
          src={linkMapaEmbutido(CHAVE_MAPS, origem, destino, modo)}
          className="h-[28rem] w-full rounded-lg border border-border lg:h-[36rem]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          O mapa aparece aqui quando a chave do Google Maps for configurada.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {modo !== "transporte" && (
          <CompartilharRota
            texto={textoDaRota({
              de: origem.nome ?? "a saída",
              para: destino.nome ?? "o destino",
              modo: rotulo,
              segundos: rota?.segundos ?? null,
              link,
            })}
          />
        )}
        <Button asChild variant="secondary" className="h-auto min-h-9 max-w-full py-2 whitespace-normal">
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Abrir no Google Maps
            <span className="sr-only">(trânsito ao vivo e navegação, abre em nova aba)</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
