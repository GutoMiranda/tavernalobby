"use client";

import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { Bike, Bus, Car, ExternalLink, Footprints, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { rotasDaEstalagem, type RotasDaEstalagem } from "@/app/aventuras/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModoRota, RotaResumo } from "@/lib/rotas";
import { cn } from "@/lib/utils";
import { decodificarPolyline, formatarDistancia, formatarDuracao, linkGoogleMaps, modoParaMapa } from "@/lib/viagem";

import { CHAVE_MAPS } from "./chave";

type LatLng = { lat: number; lng: number };
export type OrigemPainel = LatLng & { id: string; nome: string; detalhe?: string; minha: boolean };
export type EncontroPainel = LatLng & { nome: string; detalhe?: string };
export type EstalagemPainel = {
  id: string;
  nome: string;
  preco: string;
  capacidade: number | null;
  foto?: string;
  posicao: number;
  curtidas: number;
  descurtidas: number;
  escolhida: boolean;
  lat: number | null;
  lng: number | null;
};

const COR_CIDADE = "#EAB308"; // amarelo
const COR_ENCONTRO = "#DC2626"; // vermelho

const MODOS: { id: ModoRota; rotulo: string; icone: typeof Car }[] = [
  { id: "DRIVE", rotulo: "Carro", icone: Car },
  { id: "TWO_WHEELER", rotulo: "Moto", icone: Bike },
  { id: "TRANSIT", rotulo: "Ônibus / metrô", icone: Bus },
  { id: "WALK", rotulo: "A pé", icone: Footprints },
];

/** Painel da aventura: mapa grande com todos os locais, resumo das estalagens e rotas coloridas até a escolhida. */
export function PainelMapa({
  eventoId,
  origens,
  encontro,
  estalagens,
  inicial,
}: {
  eventoId: string;
  origens: OrigemPainel[];
  encontro: EncontroPainel | null;
  estalagens: EstalagemPainel[];
  inicial: string | null;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(inicial);
  const [modo, setModo] = useState<ModoRota>("DRIVE");
  const [rotas, setRotas] = useState<RotasDaEstalagem | null>(null);
  const [carregando, iniciar] = useTransition();
  const minhaOrigem = origens.find((o) => o.minha);
  const est = estalagens.find((e) => e.id === selecionada);
  const destino = est?.lat != null && est?.lng != null ? { lat: est.lat, lng: est.lng } : null;

  useEffect(() => {
    setRotas(null);
    if (!selecionada || !destino || !CHAVE_MAPS) return;
    iniciar(async () => {
      setRotas(await rotasDaEstalagem(eventoId, selecionada).catch(() => null));
    });
    // destino muda junto com a estalagem selecionada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId, selecionada]);

  const caminhos = useMemo(() => {
    const linha = (lista: RotaResumo[] | null | undefined, cor: string) => {
      const r = lista?.find((x) => x.modo === modo);
      return r?.polyline ? { cor, pontos: decodificarPolyline(r.polyline) } : null;
    };
    return [linha(rotas?.daCidade, COR_CIDADE), linha(rotas?.doEncontro, COR_ENCONTRO)].filter(
      (c): c is { cor: string; pontos: LatLng[] } => c !== null,
    );
  }, [rotas, modo]);

  const comLocal = estalagens.filter((e) => e.lat != null && e.lng != null);
  const enquadrar: LatLng[] = [...comLocal.map((e) => ({ lat: e.lat!, lng: e.lng! })), ...(encontro ? [encontro] : [])];
  if (enquadrar.length === 0) enquadrar.push(...origens);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {CHAVE_MAPS ? (
          <APIProvider apiKey={CHAVE_MAPS} language="pt-BR" region="BR">
            <div className="h-[26rem] overflow-hidden rounded-lg border border-border lg:h-[36rem]">
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={enquadrar[0] ?? { lat: -23.55, lng: -46.63 }}
                defaultZoom={10}
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
                fullscreenControl
              >
                <Marcadores
                  origens={origens}
                  encontro={encontro}
                  estalagens={comLocal}
                  selecionada={selecionada}
                  aoSelecionar={setSelecionada}
                />
                <Enquadrar pontos={enquadrar} caminhos={caminhos} />
                <Linhas caminhos={caminhos} />
              </Map>
            </div>
          </APIProvider>
        ) : (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            O mapa aparece aqui quando a chave do Google Maps for configurada.
          </p>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda do mapa">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-bottle" aria-hidden /> Saída de um núcleo
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ background: COR_ENCONTRO }} aria-hidden /> Ponto de encontro
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-gold" aria-hidden /> Estalagem (hospedagem)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded" style={{ background: COR_CIDADE }} aria-hidden /> Rota da sua cidade
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded" style={{ background: COR_ENCONTRO }} aria-hidden /> Rota do ponto de
            encontro
          </li>
        </ul>

        {est && (
          <section aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border bg-white/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-wood">Rotas até {est.nome}</h3>
              {carregando && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Calculando…
                </span>
              )}
            </div>
            <div role="radiogroup" aria-label="Como ir" className="flex flex-wrap gap-2">
              {MODOS.map(({ id, rotulo, icone: Icone }) => (
                <Button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={modo === id}
                  size="sm"
                  variant={modo === id ? "default" : "outline"}
                  onClick={() => setModo(id)}
                >
                  <Icone aria-hidden /> {rotulo}
                </Button>
              ))}
            </div>
            {!destino ? (
              <p className="text-sm text-muted-foreground">
                Esta estalagem ainda não tem endereço. Edite para incluir.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Trecho
                  titulo="Da sua cidade"
                  cor={COR_CIDADE}
                  origem={minhaOrigem ?? null}
                  destino={destino}
                  rotas={rotas?.daCidade}
                  modo={modo}
                  carregando={carregando}
                  semOrigem="Informe a cidade de saída do seu núcleo em Minha família."
                />
                <Trecho
                  titulo="Do ponto de encontro"
                  cor={COR_ENCONTRO}
                  origem={encontro}
                  destino={destino}
                  rotas={rotas?.doEncontro}
                  modo={modo}
                  carregando={carregando}
                  semOrigem="O ponto de encontro ainda não foi definido (aba Geral · rotas)."
                />
              </div>
            )}
            {modo === "TWO_WHEELER" && (
              <p className="text-xs text-muted-foreground">
                Rotas de moto têm cobertura parcial do Google no Brasil; quando não houver, use a de carro.
              </p>
            )}
          </section>
        )}
      </div>

      <section aria-label="Estalagens" className="flex min-w-0 flex-col gap-2">
        <h3 className="font-display text-lg font-semibold text-wood">Estalagens · hospedagens</h3>
        {estalagens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma estalagem sugerida ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:max-h-[48rem] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
            {estalagens.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelecionada(e.id)}
                  aria-pressed={selecionada === e.id}
                  className={cn(
                    "flex w-full gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                    selecionada === e.id ? "border-gold bg-gold/15" : "border-border bg-white/40",
                  )}
                >
                  {e.foto ? (
                    // Fotos vêm de sites externos (links colados pelos membros).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.foto}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-20 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted font-display text-2xl text-wood">
                      {e.posicao}º
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium">
                        {e.foto && `${e.posicao}º · `}
                        {e.nome}
                      </span>
                      {e.escolhida && <Badge>Escolhida</Badge>}
                    </span>
                    <span className="text-sm">{e.preco} no total</span>
                    {e.capacidade && <span className="text-sm text-muted-foreground">Até {e.capacidade} pessoas</span>}
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="size-3.5" aria-hidden /> {e.curtidas}
                        <span className="sr-only">curtidas</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="size-3.5" aria-hidden /> {e.descurtidas}
                        <span className="sr-only">descurtidas</span>
                      </span>
                      {e.lat == null && <span>sem endereço</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Trecho({
  titulo,
  cor,
  origem,
  destino,
  rotas,
  modo,
  carregando,
  semOrigem,
}: {
  titulo: string;
  cor: string;
  origem: LatLng | null;
  destino: LatLng;
  rotas: RotaResumo[] | null | undefined;
  modo: ModoRota;
  carregando: boolean;
  semOrigem: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border-l-4 bg-white/60 p-2" style={{ borderLeftColor: cor }}>
      <p className="font-medium">{titulo}</p>
      {!origem ? (
        <p className="text-sm text-muted-foreground">{semOrigem}</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {MODOS.map(({ id, rotulo }) => {
              const r = rotas?.find((x) => x.modo === id);
              return (
                <li key={id} className={cn("rounded px-1.5 py-1", id === modo && "bg-gold/20 font-medium")}>
                  <span className="block text-xs text-muted-foreground">{rotulo}</span>
                  {carregando && !rotas ? "…" : r?.segundos != null ? formatarDuracao(r.segundos) : "sem rota"}
                  {r?.segundos != null && r.metros != null && (
                    <span className="text-xs text-muted-foreground"> · {formatarDistancia(r.metros)}</span>
                  )}
                  {r?.segundos != null && r.segundosSemTransito != null && r.segundos - r.segundosSemTransito > 300 && (
                    <span className="block text-xs text-alert">
                      +{formatarDuracao(r.segundos - r.segundosSemTransito)} de trânsito
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <a
            href={linkGoogleMaps(origem, destino, modoParaMapa(modo))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-bottle underline underline-offset-4"
          >
            Abrir no Google Maps (trânsito ao vivo) <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </>
      )}
    </div>
  );
}

function Marcadores({
  origens,
  encontro,
  estalagens,
  selecionada,
  aoSelecionar,
}: {
  origens: OrigemPainel[];
  encontro: EncontroPainel | null;
  estalagens: EstalagemPainel[];
  selecionada: string | null;
  aoSelecionar: (id: string) => void;
}) {
  const [aberto, setAberto] = useState<{ nome: string; detalhe?: string; pos: LatLng } | null>(null);

  return (
    <>
      {origens.map((o) => (
        <AdvancedMarker
          key={o.id}
          position={o}
          title={o.nome}
          onClick={() => setAberto({ nome: o.nome, detalhe: o.detalhe, pos: o })}
        >
          <Pin background="#1F4D3A" borderColor="#F3E7CF" glyphColor="#F3E7CF" scale={o.minha ? 1.2 : 0.9} />
        </AdvancedMarker>
      ))}
      {encontro && (
        <AdvancedMarker
          position={encontro}
          title={encontro.nome}
          onClick={() => setAberto({ nome: encontro.nome, detalhe: encontro.detalhe, pos: encontro })}
        >
          <Pin background={COR_ENCONTRO} borderColor="#3B2A1E" glyphColor="#FFFFFF" scale={1.2} />
        </AdvancedMarker>
      )}
      {estalagens.map((e) => (
        <AdvancedMarker
          key={e.id}
          position={{ lat: e.lat!, lng: e.lng! }}
          title={e.nome}
          zIndex={selecionada === e.id ? 10 : 1}
          onClick={() => {
            aoSelecionar(e.id);
            setAberto({ nome: e.nome, detalhe: `${e.preco} no total`, pos: { lat: e.lat!, lng: e.lng! } });
          }}
        >
          <Pin
            background="#E0A030"
            borderColor={selecionada === e.id ? "#DC2626" : "#3B2A1E"}
            glyphColor="#3B2A1E"
            scale={selecionada === e.id || e.escolhida ? 1.4 : 1}
          />
        </AdvancedMarker>
      ))}
      {aberto && (
        <InfoWindow position={aberto.pos} onCloseClick={() => setAberto(null)} pixelOffset={[0, -36]}>
          <div className="text-sm text-[#2A1D14]">
            <strong>{aberto.nome}</strong>
            {aberto.detalhe && <div>{aberto.detalhe}</div>}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

/** Enquadra os locais (estalagens e encontro) com zoom próximo; com rota desenhada, enquadra a rota. */
function Enquadrar({ pontos, caminhos }: { pontos: LatLng[]; caminhos: { pontos: LatLng[] }[] }) {
  const map = useMap();
  const chave = JSON.stringify([pontos, caminhos.map((c) => c.pontos.length)]);

  useEffect(() => {
    if (!map) return;
    const todos = caminhos.length > 0 ? caminhos.flatMap((c) => c.pontos) : pontos;
    if (todos.length === 0) return;
    if (todos.length === 1) {
      map.setCenter(todos[0]);
      map.setZoom(14);
      return;
    }
    const limites = new google.maps.LatLngBounds();
    todos.forEach((p) => limites.extend(p));
    map.fitBounds(limites, 48);
    const ouvinte = map.addListener("idle", () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      ouvinte.remove();
    });
    return () => ouvinte.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, chave]);

  return null;
}

/** Desenha as rotas como linhas coloridas, com contorno escuro para destacar no mapa. */
function Linhas({ caminhos }: { caminhos: { cor: string; pontos: LatLng[] }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const linhas = caminhos.flatMap((c) => [
      new google.maps.Polyline({ path: c.pontos, strokeColor: "#3B2A1E", strokeWeight: 8, strokeOpacity: 0.6, map }),
      new google.maps.Polyline({ path: c.pontos, strokeColor: c.cor, strokeWeight: 5, strokeOpacity: 1, map }),
    ]);
    return () => linhas.forEach((l) => l.setMap(null));
  }, [map, caminhos]);

  return null;
}
