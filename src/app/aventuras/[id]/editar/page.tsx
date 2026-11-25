import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CamposAventura } from "@/components/aventura/campos-aventura";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { exigirAdmin } from "@/lib/auth";
import { FASE_INFO, FASES } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";

import { editarAventura } from "../../actions";

export const metadata: Metadata = { title: "Editar aventura" };

export default async function EditarAventuraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();
  const { evento } = await carregarAventura(supabase, id);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Editar aventura</CardTitle>
        <CardDescription>Só o Mestre da Taverna (admin) vê esta aba.</CardDescription>
      </CardHeader>
      <CardContent>
        <AcaoForm action={editarAventura} textoBotao="Salvar">
          <input type="hidden" name="id" value={id} />
          <CamposAventura evento={evento} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fase">Fase</Label>
            <select
              id="fase"
              name="fase"
              defaultValue={evento.phase}
              className="h-10 rounded-md border border-input bg-field px-3 text-base md:text-sm"
            >
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {FASE_INFO[f].nome}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              A fase muda sozinha ao fechar a data e ao escolher a estalagem. Use aqui só para corrigir ou cancelar.
            </p>
          </div>
        </AcaoForm>
      </CardContent>
    </Card>
  );
}
