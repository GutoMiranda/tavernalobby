import { NextResponse } from "next/server";

import { caminhoSeguro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Volta do Google ou do link mágico: troca o código pela sessão. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const depois = caminhoSeguro(url.searchParams.get("depois"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(depois, url.origin));
  }
  return NextResponse.redirect(new URL("/entrar?erro=1", url.origin));
}
