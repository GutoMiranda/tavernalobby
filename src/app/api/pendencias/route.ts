import { NextResponse } from "next/server";

import { getPermissoes, getSessao } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";
import { pendenciasDaTaverna, semRepetir } from "@/lib/pendencias-dados";

/** O que falta a pessoa logada fazer em todas as aventuras em andamento (para a gaveta do sino). */
export async function GET() {
  const sessao = await getSessao().catch(() => null);
  const pessoa = sessao?.pessoa;
  if (!sessao || !pessoa || pessoa.status !== "approved") {
    return NextResponse.json({ erro: "Entre para ver suas pendências." }, { status: 401 });
  }
  const { data: eventos } = await sessao.supabase
    .from("events")
    .select(COLUNAS_EVENTO)
    .not("phase", "in", "(concluida,cancelada)")
    .returns<Evento[]>();
  const permissoes = await getPermissoes();
  const lista = await pendenciasDaTaverna(sessao.supabase, pessoa, eventos ?? [], permissoes.datas.editar).catch(
    () => [],
  );
  return NextResponse.json(
    { pendencias: semRepetir(lista).map(({ texto, href, aventura }) => ({ texto, href, aventura })) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
