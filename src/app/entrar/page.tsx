import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { LogoBrasao } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { caminhoSeguro, getSessao } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ depois?: string; erro?: string }>;
}) {
  const { depois, erro } = await searchParams;
  const sessao = await getSessao();
  if (sessao) redirect(caminhoSeguro(depois));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <LogoBrasao largura={260} className="drop-shadow-[0_6px_18px_rgb(0_0_0/0.6)]" />
        <h1 className="text-2xl font-bold text-wood">Entrar na taverna</h1>
        <p className="text-muted-foreground">Use sua conta Google ou receba um link de acesso por e-mail.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo, aventureiro</CardTitle>
          <CardDescription>
            Primeira vez? Depois de entrar, o Mestre da Taverna (admin) aprova seu acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {erro && (
            <p role="alert" className="rounded-md bg-alert/10 p-3 text-sm font-medium text-alert">
              Não foi possível concluir o login. Tente de novo.
            </p>
          )}
          <LoginForm depois={depois ? caminhoSeguro(depois) : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
