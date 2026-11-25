"use client";

import type { MembroChat } from "./chat-conversa";
import { useChatStore } from "./estado-chat";
import { ListaNaTaverna } from "./painel-chat";

/** Lista de quem está na taverna para a página /chat (a presença vem do painel do cabeçalho). */
export function ListaOnlinePagina({ membros, euId }: { membros: MembroChat[]; euId: string }) {
  const { online } = useChatStore();
  const ordenados = [...membros].sort(
    (a, b) => Number(online.has(b.id)) - Number(online.has(a.id)) || a.name.localeCompare(b.name),
  );
  return <ListaNaTaverna membros={ordenados} online={online} euId={euId} />;
}
