import Link from "next/link";

import { Logo } from "@/components/logo";
import { SinoNotificacoes } from "@/components/sino-notificacoes";
import { getSessao } from "@/lib/auth";
import { contarNaoLidas, garantirLembretesDeDeposito } from "@/lib/notificacoes-dados";

export async function SiteHeader() {
  const sessao = await getSessao().catch(() => null);
  const pessoa = sessao?.pessoa;
  const aprovado = pessoa?.status === "approved";
  let naoLidas = 0;
  if (sessao && pessoa && aprovado) {
    await garantirLembretesDeDeposito(pessoa).catch((e) => console.error("[notificacoes] lembretes", e));
    naoLidas = await contarNaoLidas(sessao.supabase).catch(() => 0);
  }

  return (
    <header className="bg-madeira sticky top-0 z-40 border-b border-gold/40 pt-[env(safe-area-inset-top)] text-parchment shadow-[0_8px_24px_-12px_rgb(0_0_0/0.9)]">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-screen-2xl items-center gap-3 sm:h-20 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          <span className="relative grid shrink-0 place-items-center">
            <span
              aria-hidden
              className="absolute size-14 rounded-full bg-[radial-gradient(circle,rgb(242_165_65/0.45),transparent_70%)] blur-sm sm:size-16"
            />
            <Logo size={52} className="relative drop-shadow-[0_0_12px_rgb(242_165_65/0.7)] sm:hidden" />
            <Logo size={62} className="relative hidden drop-shadow-[0_0_12px_rgb(242_165_65/0.7)] sm:block" />
          </span>
          <span className="titulo-marca truncate font-display text-[1.7rem] leading-none font-bold tracking-wide sm:text-4xl">
            Taverna <span className="text-[0.8em] italic">O</span> Lobby
          </span>
        </Link>
        {aprovado && pessoa && <SinoNotificacoes pessoaId={pessoa.id} naoLidas={naoLidas} />}
        {sessao && (
          <form action="/auth/sair" method="post" className={aprovado ? undefined : "ml-auto"}>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-sm text-parchment underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              Sair
            </button>
          </form>
        )}
      </div>
      {aprovado && (
        <nav aria-label="Principal" className="border-t border-gold/20">
          <ul className="mx-auto flex w-full max-w-screen-2xl gap-1 overflow-x-auto px-2 py-1 text-sm sm:px-4 lg:px-6">
            <ItemMenu href="/">Taverna</ItemMenu>
            <ItemMenu href="/aventuras">Aventuras</ItemMenu>
            <ItemMenu href="/familia">Minha família</ItemMenu>
            {pessoa?.is_admin && <ItemMenu href="/admin/membros">Membros</ItemMenu>}
          </ul>
        </nav>
      )}
    </header>
  );
}

function ItemMenu({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-md px-3 py-1.5 whitespace-nowrap text-parchment hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        {children}
      </Link>
    </li>
  );
}
