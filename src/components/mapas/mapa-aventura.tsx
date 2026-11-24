"use client";

import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

import { CHAVE_MAPS } from "./chave";

export type PontoMapa = {
  id: string;
  tipo: "origem" | "estalagem";
  nome: string;
  detalhe?: string;
  lat: number;
  lng: number;
  escolhida?: boolean;
};

/** Mapa simples com as origens dos núcleos e as estalagens da aventura. */
export function MapaAventura({ pontos }: { pontos: PontoMapa[] }) {
  if (!CHAVE_MAPS) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        O mapa aparece aqui quando a chave do Google Maps for configurada.
      </p>
    );
  }
  if (pontos.length === 0) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Nenhum ponto no mapa ainda. Informe a cidade de saída do seu núcleo e o endereço das estalagens.
      </p>
    );
  }

  return (
    <APIProvider apiKey={CHAVE_MAPS} language="pt-BR" region="BR">
      <div className="h-80 overflow-hidden rounded-lg border border-border">
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: pontos[0].lat, lng: pontos[0].lng }}
          defaultZoom={6}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
        >
          <Pontos pontos={pontos} />
        </Map>
      </div>
      <ul className="mt-2 flex flex-wrap gap-4 text-sm" aria-label="Legenda do mapa">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-bottle" aria-hidden /> Origem de um núcleo
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-gold" aria-hidden /> Estalagem (hospedagem)
        </li>
      </ul>
    </APIProvider>
  );
}

function Pontos({ pontos }: { pontos: PontoMapa[] }) {
  const map = useMap();
  const [aberto, setAberto] = useState<string | null>(null);

  // Enquadra todos os pontos.
  useEffect(() => {
    if (!map || pontos.length === 0) return;
    if (pontos.length === 1) {
      map.setCenter({ lat: pontos[0].lat, lng: pontos[0].lng });
      map.setZoom(11);
      return;
    }
    const limites = new google.maps.LatLngBounds();
    pontos.forEach((p) => limites.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(limites, 40);
  }, [map, pontos]);

  const selecionado = pontos.find((p) => p.id === aberto);

  return (
    <>
      {pontos.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.nome} onClick={() => setAberto(p.id)}>
          {p.tipo === "origem" ? (
            <Pin background="#1F4D3A" borderColor="#F3E7CF" glyphColor="#F3E7CF" />
          ) : (
            <Pin background="#E0A030" borderColor="#3B2A1E" glyphColor="#3B2A1E" scale={p.escolhida ? 1.4 : 1} />
          )}
        </AdvancedMarker>
      ))}
      {selecionado && (
        <InfoWindow position={{ lat: selecionado.lat, lng: selecionado.lng }} onCloseClick={() => setAberto(null)}>
          <div className="text-sm text-[#2A1D14]">
            <strong>{selecionado.nome}</strong>
            {selecionado.detalhe && <div>{selecionado.detalhe}</div>}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
