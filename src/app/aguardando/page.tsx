import { Hourglass } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessao } from "@/lib/auth";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function AguardandoPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (sessao.pessoa?.status === "approved") redirect("/");

  const recusado = sessao.pessoa?.status === "rejected";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <Card>
        <CardHeader>
          <span
            className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-wood text-gold"
            aria-hidden
          >
            <Hourglass className="size-6" />
          </span>
          <CardTitle>{recusado ? "Acesso não aprovado" : "Aguardando aprovação"}</CardTitle>
          <CardDescription>
            {recusado
              ? "O Mestre da Taverna (admin) não aprovou este acesso. Se for engano, fale com ele no WhatsApp."
              : "Você entrou como " +
                (sessao.pessoa?.name ?? sessao.user.email) +
                ". Agora o Mestre da Taverna (admin) precisa aprovar seu acesso. Enquanto isso, puxe uma cadeira perto da lareira."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conta: <strong className="text-foreground">{sessao.user.email}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
