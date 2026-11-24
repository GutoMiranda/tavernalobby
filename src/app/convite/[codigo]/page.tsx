import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Convite" };

export default async function ConvitePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const sessao = await getSessao();
  if (sessao) redirect("/");

  const supabase = await createClient();
  const { data: valido } = await supabase.rpc("check_invite_code", { p_code: codigo });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size={72} />
        <h1 className="text-2xl font-bold text-wood">Convite para a taverna</h1>
      </div>
      {valido ? (
        <Card>
          <CardHeader>
            <CardTitle>Você foi convidado para a party!</CardTitle>
            <CardDescription>
              Entre com sua conta. Depois, o Mestre da Taverna (admin) aprova seu acesso ao grupo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>
              Este link de convite não vale mais. Peça um link novo para quem te convidou.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
