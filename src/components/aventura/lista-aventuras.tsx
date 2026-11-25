import Link from "next/link";

import { IconeEstandarte } from "@/components/icones";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contagemRegressiva, FASE_INFO } from "@/lib/aventura";
import type { Evento } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";

export function ListaAventuras({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <p className="rounded-2xl border border-[#5a4128] bg-card p-6 text-muted-foreground">
        Nenhuma aventura no quadro de missões ainda. A taverna está quieta… por enquanto.
      </p>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {eventos.map((e) => {
        const contagem = contagemRegressiva(e.start_date);
        return (
          <li key={e.id}>
            <Link
              href={`/aventuras/${e.id}`}
              className="group block h-full rounded-2xl focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <IconeEstandarte className="size-8 text-gold" />
                    <CardTitle className="text-2xl">{e.name}</CardTitle>
                    <Badge variant={e.phase === "cancelada" ? "destructive" : "secondary"}>
                      {FASE_INFO[e.phase].nome}
                    </Badge>
                  </div>
                  <CardDescription>
                    {e.start_date && e.end_date ? formatarPeriodo(e.start_date, e.end_date) : "Data a definir"}
                    {e.region && ` · ${e.region}`}
                    {contagem && ` · ${contagem}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
