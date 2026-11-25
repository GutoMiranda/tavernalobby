import type { Metadata } from "next";

import { ListaAventuras } from "@/components/aventura/lista-aventuras";
import { exigirMembro } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";

export const metadata: Metadata = { title: "Aventuras" };

export default async function AventurasPage() {
  const { supabase } = await exigirMembro();
  const { data } = await supabase
    .from("events")
    .select(COLUNAS_EVENTO)
    .order("created_at", { ascending: false })
    .returns<Evento[]>();
  const eventos = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Aventuras · encontros</p>
          <h1 className="text-2xl font-bold text-wood">Aventuras</h1>
        </div>
      </section>
      <ListaAventuras eventos={eventos} />
    </div>
  );
}
