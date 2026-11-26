import { NextResponse } from "next/server";

import { getPermissoes, getSessao } from "@/lib/auth";
import { carregarMembros } from "@/lib/membros-dados";
import { contarNaoLidas } from "@/lib/notificacoes-dados";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Temporário: mede quanto cada parte do topo do site leva no servidor (só o Mestre vê). */
export async function GET() {
  const t0 = performance.now();
  const marcas: Record<string, number> = {};
  const marca = (nome: string, desde: number) => (marcas[nome] = Math.round(performance.now() - desde));

  let t = performance.now();
  const sb = await createClient();
  marca("criarCliente", t);
  t = performance.now();
  const claims = await sb.auth.getClaims();
  marca("getClaims", t);
  t = performance.now();
  await sb.auth.getUser();
  marca("getUser", t);
  t = performance.now();
  const sessao = await getSessao();
  marca("getSessao", t);
  if (!sessao?.pessoa?.is_admin) return NextResponse.json({ erro: "só o Mestre" }, { status: 403 });
  t = performance.now();
  await sb.from("groups").select("id").limit(1);
  marca("consultaSimples", t);
  t = performance.now();
  await sb.from("groups").select("id").limit(1);
  marca("consultaSimples2", t);
  t = performance.now();
  await carregarMembros(sessao.supabase);
  marca("carregarMembros", t);
  t = performance.now();
  await getPermissoes();
  marca("permissoes", t);
  t = performance.now();
  await contarNaoLidas(sessao.supabase);
  marca("naoLidas", t);
  marca("total", t0);
  return NextResponse.json({
    marcas,
    alg: (claims.data?.header as { alg?: string } | undefined)?.alg ?? null,
    regiao: process.env.VERCEL_REGION ?? null,
  });
}
