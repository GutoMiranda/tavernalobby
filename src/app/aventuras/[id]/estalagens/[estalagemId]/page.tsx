import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormEstalagem } from "@/components/aventura/form-estalagem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { centavosParaCampo } from "@/lib/dinheiro";

export const metadata: Metadata = { title: "Editar estalagem" };

export default async function EditarEstalagemPage({
  params,
}: {
  params: Promise<{ id: string; estalagemId: string }>;
}) {
  const { id, estalagemId } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const { estalagens } = await carregarAventura(supabase, id);
  const e = estalagens.find((x) => x.id === estalagemId);
  if (!e) notFound();
  const posso = pessoa.is_admin || e.created_by === pessoa.id;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Editar estalagem</CardTitle>
        <CardDescription>
          {posso
            ? "Corrija o endereço, o preço ou o que precisar. Escolher o endereço na busca atualiza o mapa e os tempos de viagem."
            : "Só quem cadastrou a estalagem ou o Mestre da Taverna (admin) pode editar."}
        </CardDescription>
      </CardHeader>
      {posso && (
        <CardContent>
          <FormEstalagem
            eventoId={id}
            inicial={{
              id: e.id,
              name: e.name,
              url: e.url,
              preco: centavosParaCampo(e.total_price_cents),
              capacity: e.capacity,
              address: e.address,
              lat: e.lat,
              lng: e.lng,
              photos: e.photos,
              notes: e.notes,
            }}
          />
        </CardContent>
      )}
    </Card>
  );
}
