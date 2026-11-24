import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListaAventuras } from "@/components/aventura/lista-aventuras";
import { Button } from "@/components/ui/button";
import { exigirMembro } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";

export const metadata: Metadata = { title: "Aventuras" };

export default async function AventurasPage() {
  const { supabase, pessoa } = await exigirMembro();
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
        {pessoa.is_admin && (
          <Button asChild>
            <Link href="/aventuras/nova">
              <Plus aria-hidden /> Nova aventura
            </Link>
          </Button>
        )}
      </section>
      <ListaAventuras eventos={eventos} />
    </div>
  );
}
