import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contagemRegressiva, FASE_INFO } from "@/lib/aventura";
import type { Evento } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";

export function ListaAventuras({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <p className="rounded-lg bg-card p-4 text-muted-foreground">
        Nenhuma aventura no quadro de missões ainda. A taverna está quieta… por enquanto.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {eventos.map((e) => {
        const contagem = contagemRegressiva(e.start_date);
        return (
          <li key={e.id}>
            <Link
              href={`/aventuras/${e.id}`}
              className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{e.name}</CardTitle>
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
