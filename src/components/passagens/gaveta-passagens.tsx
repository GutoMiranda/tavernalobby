"use client";

import { Bus, ExternalLink, Plane, Ticket } from "lucide-react";
import { useState } from "react";

import { AcaoForm } from "@/components/acao-form";
import { Gaveta } from "@/components/gaveta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarPrecoPassagem, removerPrecoPassagem } from "@/app/aventuras/passagens-actions";
import { formatarCentavos, formatarDia } from "@/lib/format";
import { linksDeBusca, menorPorModo, type ModoPassagem, NOME_MODO_PASSAGEM, ordenarPrecos } from "@/lib/passagens";
import { cn } from "@/lib/utils";

export type PrecoNaGaveta = {
  id: string;
  mode: ModoPassagem;
  origin: string;
  destination: string;
  travel_date: string | null;
  return_date: string | null;
  price_cents: number;
  link: string | null;
  notes: string | null;
  household_id: string;
  created_at: string;
  nucleo: string;
  quem: string;
  podeRemover: boolean;
};

const ICONE: Record<ModoPassagem, typeof Bus> = { onibus: Bus, aviao: Plane };

/** Botão "Passagens" e a gaveta lateral: busca de ônibus e avião já preenchida e os preços que o grupo achou. */
export function GavetaPassagens({
  eventoId,
  deInicial,
  paraInicial,
  idaInicial,
  voltaInicial,
  precos,
}: {
  eventoId: string;
  deInicial: string;
  paraInicial: string;
  idaInicial: string | null;
  voltaInicial: string | null;
  precos: PrecoNaGaveta[];
}) {
  const [aberta, setAberta] = useState(false);
  const [modo, setModo] = useState<ModoPassagem>("onibus");
  const [de, setDe] = useState(deInicial);
  const [para, setPara] = useState(paraInicial);
  const [ida, setIda] = useState(idaInicial ?? "");
  const [volta, setVolta] = useState(voltaInicial ?? "");

  const links = linksDeBusca(modo, { de, para, ida: ida || null, volta: volta || null });
  const menor = menorPorModo(precos);
  const lista = ordenarPrecos(precos.filter((p) => p.mode === modo));
  const prontoParaBuscar = de.trim() && para.trim();

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
        <Ticket aria-hidden /> Passagens
        {(menor.onibus ?? menor.aviao) != null && (
          <span className="text-xs text-muted-foreground">
            · a partir de{" "}
            {formatarCentavos(Math.min(...[menor.onibus, menor.aviao].filter((v): v is number => v != null)))}
          </span>
        )}
      </Button>

      <Gaveta
        id="gaveta-passagens"
        titulo={
          <span className="flex items-center gap-2">
            <Ticket className="size-5 text-gold" aria-hidden /> Passagens
          </span>
        }
        aberta={aberta}
        onFechar={() => setAberta(false)}
      >
        <div className="flex flex-col gap-5 p-4">
          <div role="radiogroup" aria-label="Tipo de passagem" className="grid grid-cols-2 gap-2">
            {(["onibus", "aviao"] as const).map((m) => {
              const Icone = ICONE[m];
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={modo === m}
                  onClick={() => setModo(m)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border-2 px-3 py-2 transition-colors",
                    modo === m ? "border-gold bg-gold/15 text-wood" : "border-border text-muted-foreground",
                  )}
                >
                  <Icone className="size-6" aria-hidden />
                  <span className="font-display text-lg font-semibold">{NOME_MODO_PASSAGEM[m]}</span>
                  <span className="text-xs">
                    {menor[m] != null ? `menor: ${formatarCentavos(menor[m]!)}` : "nenhum preço ainda"}
                  </span>
                </button>
              );
            })}
          </div>

          <section aria-labelledby="busca-passagem" className="flex flex-col gap-3">
            <h3 id="busca-passagem" className="font-display text-lg font-semibold text-wood">
              Buscar
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-de">De</Label>
                <Input id="pas-de" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Sua cidade" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-para">Para</Label>
                <Input id="pas-para" value={para} onChange={(e) => setPara(e.target.value)} placeholder="Destino" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-ida">Ida</Label>
                <Input id="pas-ida" type="date" value={ida} onChange={(e) => setIda(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pas-volta">Volta</Label>
                <Input id="pas-volta" type="date" value={volta} onChange={(e) => setVolta(e.target.value)} />
              </div>
            </div>
            {prontoParaBuscar ? (
              <ul className="flex flex-col gap-2">
                {links.map((l) => (
                  <li key={l.rotulo}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                    >
                      <span>
                        <span className="font-medium text-parchment">{l.rotulo}</span>
                        <span className="block text-xs text-muted-foreground">{l.detalhe}</span>
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-gold" aria-hidden />
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Preencha de onde e para onde para ver os links.</p>
            )}
            <p className="text-xs text-muted-foreground">
              O site não vende passagens: os links abrem a busca nos sites. Achou um preço bom? Registre abaixo para o
              grupo comparar.
            </p>
          </section>

          <section aria-labelledby="precos-grupo" className="flex flex-col gap-2">
            <h3 id="precos-grupo" className="font-display text-lg font-semibold text-wood">
              Preços que o grupo achou · {NOME_MODO_PASSAGEM[modo].toLowerCase()}
            </h3>
            {lista.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém registrou ainda. Seja o primeiro batedor!</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lista.map((p, i) => (
                  <li key={p.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-semibold text-wood">{formatarCentavos(p.price_cents)}</span>
                      {i === 0 && <Badge>Mais barato</Badge>}
                    </div>
                    <p>
                      {p.origin} → {p.destination}
                      {p.travel_date && ` · ida ${formatarDia(p.travel_date)}`}
                      {p.return_date && ` · volta ${formatarDia(p.return_date)}`}
                    </p>
                    {p.notes && <p className="text-muted-foreground">{p.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      por pessoa · achado por {p.quem} ({p.nucleo})
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-bottle underline underline-offset-4"
                        >
                          Ver oferta <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      )}
                      {p.podeRemover && (
                        <AcaoForm
                          action={removerPrecoPassagem}
                          textoBotao="Remover"
                          variante="ghost"
                          tamanho="sm"
                          textoEnviando="…"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="evento" value={eventoId} />
                        </AcaoForm>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="rounded-lg border border-gold/40 p-3">
            <summary className="cursor-pointer font-medium text-wood">
              Registrar um preço de {NOME_MODO_PASSAGEM[modo].toLowerCase()}
            </summary>
            <AcaoForm action={registrarPrecoPassagem} textoBotao="Registrar preço" limparAoConcluir className="mt-3">
              <input type="hidden" name="evento" value={eventoId} />
              <input type="hidden" name="modo" value={modo} />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-de">De</Label>
                  <Input id="reg-de" name="de" required maxLength={120} defaultValue={de} key={`de-${de}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-para">Para</Label>
                  <Input id="reg-para" name="para" required maxLength={120} defaultValue={para} key={`para-${para}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-ida">Ida</Label>
                  <Input id="reg-ida" name="ida" type="date" defaultValue={ida} key={`ida-${ida}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-volta">Volta</Label>
                  <Input id="reg-volta" name="volta" type="date" defaultValue={volta} key={`volta-${volta}`} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-preco">Preço por pessoa (R$)</Label>
                <Input id="reg-preco" name="preco" inputMode="decimal" required placeholder="0,00" />
                <p className="text-xs text-muted-foreground">Ida e volta, se você buscou as duas.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-link">Link da oferta (opcional)</Label>
                <Input id="reg-link" name="link" type="url" maxLength={500} placeholder="https://" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-obs">Observação (opcional)</Label>
                <Input id="reg-obs" name="obs" maxLength={300} placeholder="Ex.: saída 7h, direto" />
              </div>
            </AcaoForm>
          </details>
        </div>
      </Gaveta>
    </>
  );
}
