import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AcaoForm } from "@/components/acao-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessao } from "@/lib/auth";
import type { EstadoAcao } from "@/lib/erros";

import { aceitarConvite } from "../../actions";

export const metadata: Metadata = { title: "Assumir perfil" };

export default async function AceitarConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/entrar?depois=/familia/aceitar/${token}`);

  const { data } = await sessao.supabase.rpc("get_claim_invite", { p_token: token });
  const convite = (data as { person_name: string; household_name: string }[] | null)?.[0];

  const aceitar = async (_estado: EstadoAcao, _dados: FormData) => {
    "use server";
    return aceitarConvite(token);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <Card>
        {convite ? (
          <>
            <CardHeader>
              <CardTitle>Assumir o perfil de {convite.person_name}</CardTitle>
              <CardDescription>
                Você vai entrar no núcleo <strong>{convite.household_name}</strong> com sua própria conta (
                {sessao.user.email}), mantendo presenças e histórico já registrados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcaoForm action={aceitar} textoBotao="Assumir este perfil" textoEnviando="Entrando…" />
            </CardContent>
          </>
        ) : (
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>Este convite expirou ou já foi usado. Peça um novo para sua família.</CardDescription>
          </CardHeader>
        )}
      </Card>
    </div>
  );
}
