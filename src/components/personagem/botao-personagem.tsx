"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { salvarPersonagem } from "@/app/familia/actions";
import { Gaveta } from "@/components/gaveta";
import type { Papel } from "@/lib/personagem";

import { Avatar } from "./avatar";
import { EditorPersonagem } from "./editor-personagem";

/** Avatar no cabeçalho: abre a gaveta "Seu personagem" para trocar foto, emblema, cor e epíteto. */
export function BotaoPersonagem({
  pessoaId,
  userId,
  nome,
  papel,
  avatar,
  cor,
  epiteto,
  fotoCaminho,
  fotoUrl,
}: {
  pessoaId: string;
  userId: string;
  nome: string;
  papel: Papel;
  avatar: string | null;
  cor: string | null;
  epiteto: string | null;
  fotoCaminho: string | null;
  fotoUrl: string | null;
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Seu personagem"
        aria-expanded={aberta}
        aria-controls="gaveta-personagem"
        className="rounded-full focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <Avatar nome={nome} avatar={avatar} foto={fotoUrl} cor={cor} papel={papel} tamanho={36} />
      </button>
      <Gaveta id="gaveta-personagem" titulo="Seu personagem" aberta={aberta} onFechar={fechar}>
        <div className="flex flex-col gap-4 p-4">
          {aberta && (
            <EditorPersonagem
              pessoaId={pessoaId}
              nome={nome}
              papel={papel}
              userId={userId}
              inicial={{ avatar, cor, epiteto, fotoCaminho, fotoUrl }}
              acao={salvarPersonagem}
            />
          )}
          <Link href="/familia" onClick={fechar} className="text-sm text-bottle underline underline-offset-4">
            Ir para Minha família (núcleo, dependentes e cidade de saída)
          </Link>
          <form action="/auth/sair" method="post" className="border-t border-border pt-3">
            <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
              Sair da conta
            </button>
          </form>
        </div>
      </Gaveta>
    </>
  );
}
