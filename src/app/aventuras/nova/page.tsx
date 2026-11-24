import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CamposAventura } from "@/components/aventura/campos-aventura";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirAdmin } from "@/lib/auth";

import { criarAventura } from "../actions";

export const metadata: Metadata = { title: "Nova aventura" };

export default async function NovaAventuraPage() {
  await exigirAdmin();
  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm text-muted-foreground">Aventuras · encontros</p>
        <h1 className="text-2xl font-bold text-wood">Nova aventura</h1>
      </section>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Quadro de missões</CardTitle>
          <CardDescription>Depois de criar, cadastre as datas candidatas para a party votar.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={criarAventura} textoBotao="Criar aventura" textoEnviando="Criando…">
            <CamposAventura />
          </AcaoForm>
        </CardContent>
      </Card>
    </div>
  );
}
