import { Flag } from "lucide-react";
import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CamposAventura } from "@/components/aventura/campos-aventura";
import { FormPontoEncontro } from "@/components/aventura/form-ponto-encontro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { editarAventura } from "@/app/aventuras/actions";
import { exigirPermissao } from "@/lib/auth";
import { FASE_INFO, FASES } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";

export const metadata: Metadata = { title: "Aventura" };

export default async function SalaoAventuraDadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, permissoes } = await exigirPermissao("aventura", "ver");
  const { evento } = await carregarAventura(supabase, id);
  const edita = permissoes.aventura.editar;

  return (
    <div className="grade-taverna grade-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados da aventura</CardTitle>
          <CardDescription>
            {edita ? "Nome, descrição, período candidato, região e fase." : "Você pode ver, mas não alterar."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!edita ? (
            <p className="text-muted-foreground">
              {evento.name}
              {evento.region ? ` · ${evento.region}` : ""} · fase {FASE_INFO[evento.phase].nome}
            </p>
          ) : (
            <AcaoForm action={editarAventura} textoBotao="Salvar">
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-col gap-4">
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
                    A fase muda sozinha ao fechar a data e ao escolher a estalagem. Use aqui só para corrigir ou
                    cancelar.
                  </p>
                </div>
              </div>
            </AcaoForm>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="size-5 text-bottle" aria-hidden /> Ponto de encontro
          </CardTitle>
          <CardDescription>
            Onde a party se reúne antes de seguir para a estalagem. Aparece na aba Mapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {edita ? (
            <FormPontoEncontro id={id} evento={evento} />
          ) : (
            <p className="text-muted-foreground">
              {evento.meeting_name ?? evento.meeting_address ?? "Ainda não definido."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
