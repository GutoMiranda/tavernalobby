"use client";

import { Bike, Bus, Car, ExternalLink, Footprints } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { linkGoogleMaps, linkMapaEmbutido, type ModoMapa } from "@/lib/viagem";

import { CHAVE_MAPS } from "./chave";

const MODOS: { id: ModoMapa; rotulo: string; icone: typeof Car }[] = [
  { id: "carro", rotulo: "Carro", icone: Car },
  { id: "moto", rotulo: "Moto", icone: Bike },
  { id: "transporte", rotulo: "Ônibus / metrô", icone: Bus },
  { id: "a_pe", rotulo: "A pé", icone: Footprints },
];

type Ponto = { lat: number; lng: number };

/** Rota no Google Maps embutido, com troca de modo e botão para abrir no app do Maps. */
export function RotaViewer({ origem, destino }: { origem: Ponto; destino: Ponto }) {
  const [modo, setModo] = useState<ModoMapa>("carro");

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Como ir" className="flex flex-wrap gap-2">
        {MODOS.map(({ id, rotulo, icone: Icone }) => (
          <Button
            key={id}
            type="button"
            role="radio"
            aria-checked={modo === id}
            variant="outline"
            size="sm"
            onClick={() => setModo(id)}
            className={cn(
              modo === id &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
          >
            <Icone aria-hidden /> {rotulo}
          </Button>
        ))}
      </div>
      {modo === "moto" && (
        <p className="text-sm text-muted-foreground">
          O mapa embutido mostra a rota de carro; o tempo de moto aparece no resumo acima, quando o Google tem essa
          rota.
        </p>
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
      <div>
        <Button asChild variant="secondary">
          <a href={linkGoogleMaps(origem, destino, modo)} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Abrir no Google Maps (trânsito ao vivo e navegação)
          </a>
        </Button>
      </div>
    </div>
  );
}
