import Link from "next/link";

import { Logo } from "@/components/logo";
import { getSessao } from "@/lib/auth";

export async function SiteHeader() {
  const sessao = await getSessao().catch(() => null);
  const pessoa = sessao?.pessoa;
  const aprovado = pessoa?.status === "approved";

  return (
    <header className="bg-madeira sticky top-0 z-40 border-b-2 border-gold/70 pt-[env(safe-area-inset-top)] text-parchment shadow-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          <Logo size={36} />
          <span className="truncate font-display text-lg leading-none font-bold tracking-wide text-gold">
            Taverna O Lobby
          </span>
        </Link>
        {sessao && (
          <form action="/auth/sair" method="post" className="ml-auto">
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
          <ul className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-2 py-1 text-sm">
            <ItemMenu href="/">Taverna</ItemMenu>
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
