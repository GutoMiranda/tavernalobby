import Link from "next/link";

import { CENA_DA_FASE, CenaQuest, MOLDURA_DA_FASE } from "@/components/cena-quest";
import { Card } from "@/components/ui/card";
import { contagemRegressiva, FASE_INFO } from "@/lib/aventura";
import { fotosDasFases } from "@/lib/cenas";
import type { Evento } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";

/** Quadro de missões: cada aventura é um card de "quest" com cena da fase, moldura e texto centralizado. */
export function ListaAventuras({ eventos }: { eventos: Evento[] }) {
  const fotos = fotosDasFases();
  if (eventos.length === 0) {
    return (
      <Card className="px-6 text-center text-muted-foreground">
        Nenhuma aventura no quadro de missões ainda. A taverna está quieta… por enquanto.
      </Card>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {eventos.map((e) => {
        const contagem = contagemRegressiva(e.start_date);
        const cancelada = e.phase === "cancelada";
        return (
          <li key={e.id}>
            <Link
              href={`/aventuras/${e.id}`}
              className="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              <Card
                moldura={MOLDURA_DA_FASE[e.phase]}
                className="h-full gap-3 pt-4 pb-5 text-center transition-transform duration-200 group-hover:-translate-y-1"
              >
                <div className="cena-quest">
                  <CenaQuest cena={CENA_DA_FASE[e.phase]} idBase={`cena-${e.id}`} foto={fotos[e.phase]} />
                </div>
                <div className="flex flex-col items-center gap-1.5 px-5">
                  <h3 className="font-display text-2xl leading-tight font-bold text-parchment">{e.name}</h3>
                  <p className={`font-display text-lg ${cancelada ? "text-alert" : "text-gold"}`}>
                    {FASE_INFO[e.phase].nome}
                  </p>
                  <p className="divisor-quest w-full text-xs" aria-hidden>
                    ◆
                  </p>
                  <p>
                    <span className="text-gold">Quando:</span>{" "}
                    {e.start_date && e.end_date ? formatarPeriodo(e.start_date, e.end_date) : "data a definir"}
                  </p>
                  {e.region && (
                    <p>
                      <span className="text-gold">Onde:</span> {e.region}
                    </p>
                  )}
                  {contagem && <p className="font-semibold text-wood">{contagem}</p>}
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
