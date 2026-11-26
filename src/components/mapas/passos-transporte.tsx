import { Footprints } from "lucide-react";

import type { PassoTransporte } from "@/lib/transporte";
import { formatarDuracao } from "@/lib/viagem";

/** Lista das linhas de ônibus, metrô e trem da rota, com as caminhadas entre elas. */
export function PassosTransporte({ passos }: { passos: PassoTransporte[] }) {
  return (
    <ol
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm"
      aria-label="Passo a passo"
    >
      {passos.map((p, i) =>
        p.tipo === "a_pe" ? (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <Footprints className="size-4 shrink-0" aria-hidden /> A pé, {formatarDuracao(p.segundos)}
          </li>
        ) : (
          <li key={i} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{p.veiculo}</span>
              <span
                className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ background: p.cor ?? "#1F4D3A", color: p.corTexto ?? "#FFFFFF" }}
              >
                {p.linha}
              </span>
              {p.sentido && <span className="font-medium">sentido {p.sentido}</span>}
            </span>
            <span className="text-muted-foreground">
              {p.partida && `${p.partida} · `}
              {p.de ?? "?"} → {p.para ?? "?"}
              {p.paradas ? ` · ${p.paradas} ${p.paradas === 1 ? "parada" : "paradas"}` : ""}
            </span>
          </li>
        ),
      )}
    </ol>
  );
}
