"use client";

import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { Bike, Bus, Car, ExternalLink, Flag, Footprints, Home, Loader2, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModoRota, RotaResumo } from "@/lib/rotas";
import { textoDaRota } from "@/lib/transporte";
import { cn } from "@/lib/utils";
import {
  decodificarPolyline,
  formatarDistancia,
  formatarDuracao,
  linkGoogleMaps,
  modoParaMapa,
  type OrigemDaRota,
} from "@/lib/viagem";

import { CHAVE_MAPS } from "./chave";
import { CompartilharRota } from "./compartilhar-rota";
import { PassosTransporte } from "./passos-transporte";

type LatLng = { lat: number; lng: number };
export type OrigemPainel = LatLng & { id: string; nome: string; detalhe?: string; minha: boolean };
export type EncontroPainel = LatLng & { id: string; nome: string; detalhe?: string };
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

/**
 * Painel da aventura: mapa grande com todos os locais e a lista de estalagens. A rota só aparece quando a
 * pessoa toca numa estalagem, saindo de um ponto só: a cidade do núcleo ou o ponto de encontro.
 */
export function PainelMapa({
  origens,
  encontros,
  estalagens,
  selecionada: selecionadaServidor,
  saida: saidaServidor,
  rotas,
}: {
  origens: OrigemPainel[];
  encontros: EncontroPainel[];
  estalagens: EstalagemPainel[];
  selecionada: string | null;
  /** De onde sai a rota (escolha da pessoa, ou a cidade quando houver). */
  saida: OrigemDaRota | null;
  /** Rota até a estalagem selecionada, calculada no servidor. */
  rotas: RotaResumo[] | null;
}) {
  const [modoEscolhido, setModo] = useState<ModoRota>("DRIVE");
  // Se o meio escolhido não tem rota (ex.: carro sem rota numa ilha), usa o primeiro que tiver.
  const modo =
    rotas?.find((x) => x.modo === modoEscolhido)?.segundos != null || !rotas?.some((x) => x.segundos != null)
      ? modoEscolhido
      : (rotas.find((x) => x.segundos != null)?.modo ?? modoEscolhido);
  const [carregando, iniciar] = useTransition();
  // Mostra na hora a estalagem e a saída tocadas, enquanto o servidor calcula a rota.
  const [pedido, setPedido] = useState<{ estalagem: string | null; de: OrigemDaRota | null } | null>(null);
  const selecionada = carregando && pedido ? pedido.estalagem : selecionadaServidor;
  const saida = carregando && pedido ? (pedido.de ?? saidaServidor) : saidaServidor;
  const router = useRouter();
  const caminho = usePathname();
  const ir = (estalagem: string | null, de: OrigemDaRota | null) => {
    setPedido({ estalagem, de });
    iniciar(() =>
      router.replace(
        estalagem ? `${caminho}?estalagem=${encodeURIComponent(estalagem)}${de ? `&de=${de}` : ""}` : caminho,
        { scroll: false },
      ),
    );
  };
  const setSelecionada = (id: string) => ir(id, saida);
  const minhaOrigem = origens.find((o) => o.minha);
  const est = estalagens.find((e) => e.id === selecionada);
  const destino = est?.lat != null && est?.lng != null ? { lat: est.lat, lng: est.lng } : null;

  const encontro = encontros.find((e) => `encontro:${e.id}` === saida) ?? null;
  const corDaRota = encontro ? COR_ENCONTRO : COR_CIDADE;
  const caminhos = useMemo(() => {
    const r = selecionada && !carregando ? rotas?.find((x) => x.modo === modo) : undefined;
    return r?.polyline ? [{ cor: corDaRota, pontos: decodificarPolyline(r.polyline) }] : [];
  }, [rotas, modo, corDaRota, selecionada, carregando]);

  const comLocal = estalagens.filter((e) => e.lat != null && e.lng != null);
  // Enquadra a sua saída, o ponto de encontro e as estalagens (as saídas dos outros núcleos ficam no mapa, fora do zoom).
  const enquadrar: LatLng[] = [
    ...comLocal.map((e) => ({ lat: e.lat!, lng: e.lng! })),
    ...encontros,
    ...(minhaOrigem ? [minhaOrigem] : []),
  ];
  if (enquadrar.length === 0) enquadrar.push(...origens);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {CHAVE_MAPS ? (
          <APIProvider apiKey={CHAVE_MAPS} language="pt-BR" region="BR">
            <div className="relative h-[26rem] overflow-hidden rounded-lg border border-border lg:h-[36rem]">
              {carregando && (
                <p
                  role="status"
                  className="absolute inset-x-0 top-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-gold/60 bg-[#2a1f17] px-4 py-2 text-sm text-[#f3e6cf] shadow-lg"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Calculando a rota…
                </p>
              )}
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
                  encontros={encontros}
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
            <span className="h-1 w-5 rounded" style={{ background: COR_CIDADE }} aria-hidden /> Rota saindo da sua
            cidade
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded" style={{ background: COR_ENCONTRO }} aria-hidden /> Rota saindo do ponto
            de encontro
          </li>
        </ul>

        {!est ? (
          <p className="rounded-lg border border-dashed border-gold/40 bg-surface p-3 text-sm text-muted-foreground">
            Toque numa estalagem (no mapa ou na lista) para ver a rota até ela.
          </p>
        ) : (
          <section aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-wood">Rota até {est.nome}</h3>
              <div className="flex items-center gap-2">
                {carregando && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Calculando…
                  </span>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => ir(null, null)}>
                  <X aria-hidden /> Limpar rota
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Sair de</p>
              <div role="radiogroup" aria-label="De onde sai a rota" className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  role="radio"
                  aria-checked={saida === "cidade"}
                  size="sm"
                  variant={saida === "cidade" ? "default" : "outline"}
                  disabled={!minhaOrigem}
                  onClick={() => ir(est.id, "cidade")}
                >
                  <Home aria-hidden /> Minha saída
                </Button>
                {encontros.map((e) => (
                  <Button
                    key={e.id}
                    type="button"
                    role="radio"
                    aria-checked={saida === `encontro:${e.id}`}
                    size="sm"
                    variant={saida === `encontro:${e.id}` ? "default" : "outline"}
                    onClick={() => ir(est.id, `encontro:${e.id}`)}
                    className="h-auto min-h-8 max-w-full whitespace-normal"
                  >
                    <Flag aria-hidden /> {e.nome}
                  </Button>
                ))}
              </div>
              {(!minhaOrigem || encontros.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  {!minhaOrigem && "Informe o ponto de saída do seu núcleo em Minha família. "}
                  {encontros.length === 0 && "Nenhum ponto de encontro com endereço ainda (aba Mapa)."}
                </p>
              )}
            </div>
            {!destino ? (
              <p className="text-sm text-muted-foreground">
                Esta estalagem ainda não tem endereço. Edite para incluir.
              </p>
            ) : (
              <Trecho
                titulo={encontro ? `Do ponto de encontro: ${encontro.nome}` : "Da saída do seu núcleo"}
                cor={corDaRota}
                origem={encontro ?? (saida === "cidade" ? (minhaOrigem ?? null) : null)}
                destino={destino}
                rotas={rotas}
                modo={modo}
                setModo={setModo}
                carregando={carregando}
                semOrigem="Escolha de onde sai a rota."
                nomeOrigem={encontro?.nome ?? minhaOrigem?.nome ?? "minha saída"}
                nomeDestino={est.nome}
              />
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
                    "flex w-full gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                    selecionada === e.id ? "border-gold bg-gold/15" : "border-border bg-surface",
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
  setModo,
  carregando,
  semOrigem,
  nomeOrigem,
  nomeDestino,
}: {
  nomeOrigem: string;
  nomeDestino: string;
  titulo: string;
  cor: string;
  origem: LatLng | null;
  destino: LatLng;
  rotas: RotaResumo[] | null | undefined;
  modo: ModoRota;
  setModo: (m: ModoRota) => void;
  carregando: boolean;
  semOrigem: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border-l-4 bg-surface p-2" style={{ borderLeftColor: cor }}>
      <p className="font-medium">{titulo}</p>
      {!origem ? (
        <p className="text-sm text-muted-foreground">{semOrigem}</p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Como ir" className="grid grid-cols-2 gap-1.5 text-sm">
            {(carregando || !rotas?.some((x) => x.segundos != null)
              ? MODOS
              : MODOS.filter(({ id }) => rotas.find((x) => x.modo === id)?.segundos != null)
            ).map(({ id, rotulo, icone: Icone }) => {
              const r = rotas?.find((x) => x.modo === id);
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={id === modo}
                  onClick={() => setModo(id)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-left focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                    id === modo ? "border-gold bg-gold/25 font-medium" : "border-border hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icone className="size-3.5" aria-hidden /> {rotulo}
                  </span>
                  {carregando
                    ? "…"
                    : r?.segundos != null
                      ? formatarDuracao(r.segundos)
                      : r?.erro
                        ? "erro do Google"
                        : "sem rota"}
                  {r?.segundos != null && r.metros != null && (
                    <span className="text-xs text-muted-foreground"> · {formatarDistancia(r.metros)}</span>
                  )}
                  {r?.segundos != null && r.segundosSemTransito != null && r.segundos - r.segundosSemTransito > 300 && (
                    <span className="block text-xs text-alert">
                      +{formatarDuracao(r.segundos - r.segundosSemTransito)} de trânsito
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {rotas?.find((x) => x.erro) && (
            <p className="text-xs break-words text-alert">
              O Google recusou o cálculo
              {rotas.some((x) => x.erro && x.segundos != null) ? " do traçado (tempos pela Distance Matrix)" : ""}:{" "}
              {rotas.find((x) => x.erro)?.erro}
            </p>
          )}
          {!carregando && modo === "TRANSIT" && (rotas?.find((x) => x.modo === "TRANSIT")?.passos?.length ?? 0) > 0 && (
            <PassosTransporte passos={rotas!.find((x) => x.modo === "TRANSIT")!.passos!} />
          )}
          {!carregando && (
            <CompartilharRota
              texto={textoDaRota({
                de: nomeOrigem,
                para: nomeDestino,
                modo: MODOS.find((m) => m.id === modo)?.rotulo ?? "",
                segundos: rotas?.find((x) => x.modo === modo)?.segundos ?? null,
                passos: modo === "TRANSIT" ? rotas?.find((x) => x.modo === "TRANSIT")?.passos : undefined,
                link: linkGoogleMaps(origem, destino, modoParaMapa(modo)),
              })}
            />
          )}
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
  encontros,
  estalagens,
  selecionada,
  aoSelecionar,
}: {
  origens: OrigemPainel[];
  encontros: EncontroPainel[];
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
      {encontros.map((encontro) => (
        <AdvancedMarker
          key={encontro.id}
          position={encontro}
          title={encontro.nome}
          onClick={() => setAberto({ nome: encontro.nome, detalhe: encontro.detalhe, pos: encontro })}
        >
          <Pin background={COR_ENCONTRO} borderColor="#3B2A1E" glyphColor="#FFFFFF" scale={1.2} />
        </AdvancedMarker>
      ))}
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
