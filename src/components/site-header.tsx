import Link from "next/link";
import { after } from "next/server";

import { PainelChat } from "@/components/chat/painel-chat";
import { Logo } from "@/components/logo";
import { MenuInferior } from "@/components/menu-inferior";
import { BotaoPersonagem } from "@/components/personagem/botao-personagem";
import { SinoNotificacoes } from "@/components/sino-notificacoes";
import { getPermissoes, getSessao } from "@/lib/auth";
import { carregarMembros, type Membro } from "@/lib/membros-dados";
import { contarNaoLidas, garantirLembretesDeDeposito } from "@/lib/notificacoes-dados";
import { entraNoSalao, lerPermissoes } from "@/lib/permissoes";
import { papelDe } from "@/lib/personagem";

export async function SiteHeader() {
  const sessao = await getSessao().catch(() => null);
  const pessoa = sessao?.pessoa;
  const aprovado = pessoa?.status === "approved";
  let naoLidas = 0;
  let membros: Membro[] | null = null;
  let permissoes = lerPermissoes(null);
  if (sessao && pessoa && aprovado) {
    // Em paralelo; o lembrete do Baú roda depois que a página já foi enviada.
    [membros, permissoes, naoLidas] = await Promise.all([
      carregarMembros(sessao.supabase).catch(() => null),
      getPermissoes().catch(() => lerPermissoes(null)),
      contarNaoLidas(sessao.supabase).catch(() => 0),
    ]);
    after(() => garantirLembretesDeDeposito(pessoa).catch((e) => console.error("[notificacoes] lembretes", e)));
  }

  const eu: Membro | undefined =
    pessoa && aprovado
      ? (membros?.find((m) => m.id === pessoa.id) ?? {
          id: pessoa.id,
          name: pessoa.name,
          avatar: pessoa.avatar,
          avatar_color: pessoa.avatar_color,
          epithet: pessoa.epithet,
          gender: pessoa.gender,
          foto: null,
          papel: papelDe(pessoa, sessao?.tags ?? []),
        })
      : undefined;

  return (
    <>
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
            <span className="titulo-marca flex min-w-0 flex-col font-display text-[1.35rem] leading-[0.95] font-bold tracking-wide min-[430px]:block min-[430px]:text-[1.7rem] min-[430px]:leading-none sm:text-4xl">
              <span>Taverna</span>{" "}
              <span className="whitespace-nowrap">
                <span className="text-[0.8em] italic">O</span> Lobby
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            {aprovado && pessoa && membros && (
              <PainelChat
                eu={eu!}
                moderacao={{ resolver: permissoes.chat.editar, apagar: permissoes.chat.excluir }}
                membros={membros}
              />
            )}
            {aprovado && pessoa && <SinoNotificacoes pessoaId={pessoa.id} naoLidas={naoLidas} />}
            {aprovado && eu && pessoa && sessao && (
              <BotaoPersonagem
                pessoaId={pessoa.id}
                userId={sessao.user.id}
                nome={eu.name}
                papel={eu.papel}
                avatar={eu.avatar}
                cor={eu.avatar_color}
                epiteto={eu.epithet}
                sexo={eu.gender}
                fotoCaminho={pessoa.avatar_path}
                fotoUrl={eu.foto}
              />
            )}
            {sessao && (
              <form action="/auth/sair" method="post" className={aprovado ? "hidden sm:block" : undefined}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-sm text-parchment underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                >
                  Sair
                </button>
              </form>
            )}
          </div>
        </div>
        {aprovado && (
          <nav aria-label="Principal" className="hidden border-t border-gold/20 sm:block">
            <ul className="mx-auto flex w-full max-w-screen-2xl gap-1 overflow-x-auto px-2 py-1 text-sm sm:px-4 lg:px-6">
              <ItemMenu href="/">Taverna</ItemMenu>
              <ItemMenu href="/aventuras">Aventuras</ItemMenu>
              <ItemMenu href="/familia">Minha família</ItemMenu>
              {pessoa && entraNoSalao(permissoes, pessoa.is_admin) && (
                <ItemMenu href="/mestre">Salão do Mestre</ItemMenu>
              )}
            </ul>
          </nav>
        )}
      </header>
      {aprovado && <MenuInferior salao={!!pessoa && entraNoSalao(permissoes, pessoa.is_admin)} />}
    </>
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
