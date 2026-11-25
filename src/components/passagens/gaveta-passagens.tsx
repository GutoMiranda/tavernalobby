"use client";

import { Bus, ExternalLink, Plane, Ticket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Gaveta } from "@/components/gaveta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AEROPORTOS, aeroportoPorIata, aeroportosProximos, distanciaKm } from "@/lib/aeroportos";
import { type LinkBusca, linkDeOnibus, linksDeVoo } from "@/lib/passagens";

export type LugarDaViagem = { nome: string; cidade: string | null; lat: number | null; lng: number | null };
export type DestinoDaViagem = LugarDaViagem & { fonte: "definida" | "mais_votada" | "regiao" };

const SELECT =
  "h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-parchment focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none";

/** Abaixo disso (km em linha reta), avião raramente compensa. */
const PERTO_KM = 350;

const temCoord = (l: LugarDaViagem | null): l is LugarDaViagem & { lat: number; lng: number } =>
  !!l && l.lat != null && l.lng != null;

function km(n: number) {
  return `${Math.round(n).toLocaleString("pt-BR")} km`;
}

function LinkExterno({ l, destaque }: { l: LinkBusca; destaque?: boolean }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none " +
        (destaque ? "border-gold/60 bg-gold/10" : "border-border bg-surface")
      }
    >
      <span>
        <span className="font-medium text-parchment">{l.rotulo}</span>
        <span className="block text-xs text-muted-foreground">{l.detalhe}</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-gold" aria-hidden />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function SeletorAeroporto({
  id,
  rotulo,
  valor,
  onChange,
  perto,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  perto: { iata: string; cidade: string; nome: string; km: number }[];
}) {
  const outros = AEROPORTOS.filter((a) => !perto.some((p) => p.iata === a.iata)).sort((a, b) =>
    a.cidade.localeCompare(b.cidade, "pt-BR"),
  );
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        <option value="">Escolha o aeroporto</option>
        {perto.length > 0 && (
          <optgroup label="Mais perto">
            {perto.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.cidade} · {a.nome} ({a.iata}) · {km(a.km)}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={perto.length > 0 ? "Outros" : "Aeroportos"}>
          {outros.map((a) => (
            <option key={a.iata} value={a.iata}>
              {a.cidade}/{a.uf} · {a.nome} ({a.iata})
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

/**
 * Botão "Passagens" e a gaveta: monta a viagem de cada um até a estalagem. Acha os aeroportos mais perto da
 * cidade do núcleo e da estalagem e abre a busca de voo e de ônibus já preenchida (o site não vende passagens).
 */
export function GavetaPassagens({
  destino,
  meuNucleo,
  nucleos,
  idaInicial,
  voltaInicial,
  periodoPrevia,
}: {
  destino: DestinoDaViagem | null;
  meuNucleo: LugarDaViagem | null;
  nucleos: LugarDaViagem[];
  idaInicial: string | null;
  voltaInicial: string | null;
  periodoPrevia: boolean;
}) {
  const pertoDeMim = temCoord(meuNucleo) ? aeroportosProximos(meuNucleo, 3) : [];
  const pertoDoDestino = temCoord(destino) ? aeroportosProximos(destino, 3) : [];

  const [aberta, setAberta] = useState(false);
  const [de, setDe] = useState(pertoDeMim[0]?.iata ?? "");
  const [para, setPara] = useState(pertoDoDestino[0]?.iata ?? "");
  const [ida, setIda] = useState(idaInicial ?? "");
  const [volta, setVolta] = useState(voltaInicial ?? "");

  const aDe = de ? aeroportoPorIata(de) : undefined;
  const aPara = para ? aeroportoPorIata(para) : undefined;
  const mesmo = !!aDe && !!aPara && aDe.iata === aPara.iata;
  const voos = aDe && aPara && !mesmo ? linksDeVoo(aDe, aPara, ida || null, volta || null) : [];
  const cidadeDestino = destino?.cidade ?? destino?.nome ?? "";
  const onibus = linkDeOnibus(meuNucleo?.cidade ?? "", cidadeDestino, ida || null);
  const distanciaTotal = temCoord(meuNucleo) && temCoord(destino) ? distanciaKm(meuNucleo, destino) : null;
  const pertoDemais = distanciaTotal != null && distanciaTotal < PERTO_KM;
  const aeroAteEstalagem = aPara && temCoord(destino) ? distanciaKm(aPara, destino) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setAberta(true)}
        aria-controls="gaveta-passagens"
        aria-expanded={aberta}
        className="self-end"
      >
        <Ticket aria-hidden /> Passagens · como chegar
      </Button>

      <Gaveta
        id="gaveta-passagens"
        titulo={
          <span className="flex items-center gap-2">
            <Ticket className="size-5 text-gold" aria-hidden /> Passagens · como chegar
          </span>
        }
        aberta={aberta}
        onFechar={() => setAberta(false)}
      >
        <div className="flex flex-col gap-5 p-4">
          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="text-muted-foreground">Destino</p>
            {destino ? (
              <p className="font-medium text-parchment">
                {destino.nome}
                {destino.cidade && destino.cidade !== destino.nome && ` · ${destino.cidade}`}
              </p>
            ) : (
              <p className="text-parchment">Nenhuma estalagem com endereço ainda. Escolha o aeroporto de destino.</p>
            )}
            {destino?.fonte === "mais_votada" && (
              <p className="text-xs text-muted-foreground">Prévia: a estalagem mais votada até agora.</p>
            )}
            {periodoPrevia && (
              <p className="text-xs text-muted-foreground">As datas são da opção mais votada (prévia).</p>
            )}
          </div>

          <section aria-labelledby="sua-viagem" className="flex flex-col gap-3">
            <h3 id="sua-viagem" className="font-display text-lg font-semibold text-wood">
              Sua viagem
            </h3>
            {!temCoord(meuNucleo) && (
              <p className="rounded-lg border border-gold/40 p-3 text-sm">
                Cadastre a cidade de saída do seu núcleo em{" "}
                <Link href="/familia" className="text-bottle underline underline-offset-4">
                  Minha família
                </Link>{" "}
                para o aeroporto mais perto aparecer sozinho.
              </p>
            )}
            {pertoDemais && (
              <p className="rounded-lg border border-bottle/50 bg-bottle/10 p-3 text-sm">
                São só uns {km(distanciaTotal!)} em linha reta: ônibus ou carro costuma compensar mais que avião.
              </p>
            )}
            <div className="grid gap-3">
              <SeletorAeroporto id="pas-de" rotulo="Sair do aeroporto" valor={de} onChange={setDe} perto={pertoDeMim} />
              <SeletorAeroporto
                id="pas-para"
                rotulo="Chegar no aeroporto"
                valor={para}
                onChange={setPara}
                perto={pertoDoDestino}
              />
            </div>
            {aeroAteEstalagem != null && (
              <p className="-mt-1 text-xs text-muted-foreground">
                Do aeroporto até a estalagem: uns {km(aeroAteEstalagem)} em linha reta.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-ida">Ida</Label>
                <Input id="pas-ida" type="date" value={ida} onChange={(e) => setIda(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-volta">Volta</Label>
                <Input id="pas-volta" type="date" value={volta} onChange={(e) => setVolta(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-wood">
                <Plane className="size-4" aria-hidden /> Voo
              </p>
              {voos.length > 0 ? (
                voos.map((l, i) => <LinkExterno key={l.rotulo} l={l} destaque={i === 0} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  {mesmo ? "Saída e chegada no mesmo aeroporto: vá de ônibus ou carro." : "Escolha os dois aeroportos."}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-wood">
                <Bus className="size-4" aria-hidden /> Ônibus
              </p>
              {onibus ? (
                <LinkExterno l={onibus} />
              ) : (
                <p className="text-sm text-muted-foreground">Precisa da cidade do seu núcleo e de um destino.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              O site não vende passagens: cada link abre a busca já com aeroportos e datas. Confira os dados lá antes de
              comprar.
            </p>
          </section>

          <section aria-labelledby="como-cada-um" className="flex flex-col gap-2">
            <h3 id="como-cada-um" className="font-display text-lg font-semibold text-wood">
              Como cada núcleo chega
            </h3>
            <ul className="flex flex-col gap-2">
              {nucleos.map((n, i) => {
                const aero = temCoord(n) ? aeroportosProximos(n, 1)[0] : undefined;
                const dist = temCoord(n) && temCoord(destino) ? distanciaKm(n, destino) : null;
                const voo =
                  aero && aPara && aero.iata !== aPara.iata
                    ? linksDeVoo(aero, aPara, ida || null, volta || null)[0]
                    : null;
                return (
                  <li
                    key={`${n.nome}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <p className="font-medium text-parchment">{n.nome}</p>
                    {!temCoord(n) ? (
                      <p className="text-muted-foreground">Sem cidade de saída cadastrada.</p>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          {n.cidade ?? "Cidade cadastrada"}
                          {dist != null && ` · ${km(dist)} até a estalagem`}
                        </p>
                        <p>
                          Aeroporto mais perto: {aero!.cidade} ({aero!.iata}), a {km(aero!.km)}
                        </p>
                        {dist != null && dist < PERTO_KM ? (
                          <p className="text-bottle">Perto: ônibus ou carro deve compensar.</p>
                        ) : (
                          voo && (
                            <a
                              href={voo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-bottle underline underline-offset-4"
                            >
                              Ver voos {aero!.iata} → {aPara!.iata} <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          )
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </Gaveta>
    </>
  );
}
