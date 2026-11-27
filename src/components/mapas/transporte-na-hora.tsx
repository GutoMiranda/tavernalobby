"use client";

import { Bus, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarDataHora } from "@/lib/format";
import type { RotaResumo } from "@/lib/rotas";
import { textoDaRota } from "@/lib/transporte";
import { formatarDuracao } from "@/lib/viagem";

import { CompartilharRota } from "./compartilhar-rota";
import { PassosTransporte } from "./passos-transporte";

type LatLng = { lat: number; lng: number };
type Resultado = RotaResumo & { saida: string };

/**
 * Ônibus e metrô consultados na hora: as linhas e os horários dependem de quando se sai, por isso não usam
 * o cache das outras rotas. Busca "saindo agora" ao abrir e deixa escolher outro horário de saída.
 */
export function TransporteNaHora({
  origem,
  destino,
  nomeDe,
  nomePara,
  link,
}: {
  origem: LatLng;
  destino: LatLng;
  nomeDe: string;
  nomePara: string;
  link: string;
}) {
  const [saida, setSaida] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const buscar = useCallback(
    async (quando: string) => {
      setBuscando(true);
      setErro(null);
      try {
        const q = new URLSearchParams({ o: `${origem.lat},${origem.lng}`, d: `${destino.lat},${destino.lng}` });
        // O horário digitado é o de Brasília (sem horário de verão desde 2019), seja qual for o fuso do aparelho.
        if (quando) q.set("saida", new Date(`${quando.slice(0, 16)}:00-03:00`).toISOString());
        const res = await fetch(`/api/rota-transporte?${q}`, { cache: "no-store" });
        const json = (await res.json()) as Resultado & { erro?: string };
        if (!res.ok) throw new Error(json.erro ?? "Não deu para consultar agora.");
        setResultado(json);
        if (json.segundos == null) setErro(json.erro ?? "O Google não achou ônibus ou metrô para esse horário.");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu para consultar agora.");
      } finally {
        setBuscando(false);
      }
    },
    [origem.lat, origem.lng, destino.lat, destino.lng],
  );

  useEffect(() => {
    void buscar("");
  }, [buscar]);

  const passos = resultado?.passos ?? [];
  const quando = resultado ? `saindo em ${formatarDataHora(resultado.saida)}` : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(saida);
        }}
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <Label htmlFor="saida-transporte" className="text-xs">
            Sair em (horário de Brasília; vazio = agora)
          </Label>
          <Input
            id="saida-transporte"
            type="datetime-local"
            value={saida}
            onChange={(e) => setSaida(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={buscando} className="h-auto min-h-9 py-2 whitespace-normal">
          {buscando ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : resultado ? (
            <RefreshCw aria-hidden />
          ) : (
            <Bus aria-hidden />
          )}
          {buscando ? "Buscando no Google…" : resultado ? "Atualizar linhas e horários" : "Ver linhas e horários"}
        </Button>
      </form>

      <div aria-live="polite" className={buscando ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {resultado && resultado.segundos != null && (
          <p className="mb-2 text-sm">
            <span className="font-medium">Cerca de {formatarDuracao(resultado.segundos)}</span>
            <span className="text-muted-foreground">, {quando}</span>
          </p>
        )}
        {passos.length > 0 && <PassosTransporte passos={passos} />}
        {erro && <p className="text-sm break-words text-alert">{erro}</p>}
      </div>

      <CompartilharRota
        texto={textoDaRota({
          de: nomeDe,
          para: nomePara,
          modo: "Ônibus / metrô",
          segundos: resultado?.segundos ?? null,
          passos,
          quando,
          link,
        })}
      />
    </div>
  );
}
