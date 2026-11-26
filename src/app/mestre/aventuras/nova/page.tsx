import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CamposAventura } from "@/components/aventura/campos-aventura";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/auth";

import { criarAventura } from "@/app/aventuras/actions";

export const metadata: Metadata = { title: "Nova aventura" };

export default async function NovaAventuraPage() {
  await exigirPermissao("aventura", "editar");
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-wood">Nova aventura</h2>
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
