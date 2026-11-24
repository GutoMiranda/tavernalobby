import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseEnv } from "./env";

/** Rotas abertas sem login. */
const PUBLICAS = ["/entrar", "/convite", "/auth", "/offline", "/api/infinitepay"];

export function rotaPublica(pathname: string) {
  return PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Renova a sessão do Supabase a cada requisição e manda quem não entrou para /entrar. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !rotaPublica(request.nextUrl.pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    if (request.nextUrl.pathname !== "/") {
      destino.searchParams.set("depois", request.nextUrl.pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(destino);
  }

  return response;
}
