"use client";

import { AtSign, MessagesSquare, Pin, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Avatar } from "@/components/personagem/avatar";
import { NomeEnfeitado } from "@/components/personagem/nome-enfeitado";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { ChatConversa, type MembroChat } from "./chat-conversa";
import { chatStore, useChatStore } from "./estado-chat";

const CHAVE_VISTO = "taverna-chat-visto";
const CHAVE_FIXO = "taverna-chat-fixo";

function lerFixo(): boolean {
  try {
    return localStorage.getItem(CHAVE_FIXO) === "1";
  } catch {
    return false;
  }
}
function gravarFixo(fixo: boolean) {
  try {
    if (fixo) localStorage.setItem(CHAVE_FIXO, "1");
    else localStorage.removeItem(CHAVE_FIXO);
  } catch {
    // Sem armazenamento: vale só nesta aba.
  }
}

function lerVisto(): string {
  try {
    return localStorage.getItem(CHAVE_VISTO) ?? new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}
function marcarVisto() {
  try {
    localStorage.setItem(CHAVE_VISTO, new Date().toISOString());
  } catch {
    // Sem armazenamento: o contador só volta a zero nesta aba.
  }
}

/**
 * Chat geral na lateral: botão no cabeçalho (com mensagens novas e quantos estão online) e gaveta
 * à direita (tela cheia no celular). Mantém a presença (Supabase Presence) de quem está no site.
 */
export function PainelChat({
  eu,
  moderacao,
  membros,
}: {
  eu: MembroChat;
  moderacao: { resolver: boolean; apagar: boolean };
  membros: MembroChat[];
}) {
  const { aberto, online, rascunho } = useChatStore();
  const [aba, setAba] = useState<"conversa" | "taverna">("conversa");
  const [novas, setNovas] = useState(0);
  const [montado, setMontado] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const abertoRef = useRef(aberto);
  abertoRef.current = aberto;
  const pathname = usePathname();
  const naPaginaDoChat = pathname === "/chat";

  const [fixo, setFixo] = useState(false);

  // "Manter aberto": lembra a escolha e reabre o chat ao carregar o site.
  useEffect(() => {
    setMontado(true);
    if (lerFixo()) {
      setFixo(true);
      chatStore.abrir();
    }
  }, []);

  // No computador, com o chat fixo e aberto, a página abre espaço à direita em vez de ficar coberta.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("chat-fixo", fixo && aberto);
    return () => html.classList.remove("chat-fixo");
  }, [fixo, aberto]);

  function alternarFixo(valor: boolean) {
    setFixo(valor);
    gravarFixo(valor);
  }
  useEffect(() => {
    if (rascunho) setAba("conversa");
  }, [rascunho]);

  // Presença: cada aba aberta do site conta a pessoa como online.
  useEffect(() => {
    const canal = supabase.channel("taverna-presenca", { config: { presence: { key: eu.id } } });
    canal
      .on("presence", { event: "sync" }, () => chatStore.definirOnline(Object.keys(canal.presenceState())))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") canal.track({ em: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, eu.id]);

  // Mensagens novas (de outras pessoas) enquanto o painel está fechado.
  useEffect(() => {
    let ativo = true;
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lerVisto())
      .neq("author_person_id", eu.id)
      .then(({ count }) => ativo && setNovas(count ?? 0));
    const canal = supabase
      .channel(`chat-novas-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const autor = (p.new as { author_person_id?: string }).author_person_id;
        if (autor !== eu.id && !abertoRef.current) setNovas((n) => n + 1);
      })
      .subscribe();
    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [supabase, eu.id]);

  useEffect(() => {
    if (aberto || naPaginaDoChat) {
      marcarVisto();
      setNovas(0);
    }
  }, [aberto, naPaginaDoChat]);

  useEffect(() => {
    if (!aberto || fixo) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && chatStore.fechar();
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto, fixo]);

  const quantosOnline = online.size;
  const ordenados = [...membros].sort(
    (a, b) => Number(online.has(b.id)) - Number(online.has(a.id)) || a.name.localeCompare(b.name),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => (aberto ? chatStore.fechar() : chatStore.abrir())}
        aria-expanded={aberto}
        aria-controls="painel-chat"
        className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-parchment hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <MessagesSquare className="size-6" aria-hidden />
        <span className="hidden text-sm sm:inline">Chat</span>
        {quantosOnline > 0 && (
          <span className="hidden items-center gap-1 text-xs text-bottle sm:inline-flex">
            <span className="size-2 rounded-full bg-[#6fdc6f] shadow-[0_0_6px_#6fdc6f]" aria-hidden />
            {quantosOnline}
            <span className="sr-only">{quantosOnline === 1 ? "pessoa online" : "pessoas online"}</span>
          </span>
        )}
        {novas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-alert px-1 text-xs font-bold text-on-gold">
            {novas > 99 ? "99+" : novas}
            <span className="sr-only"> mensagens novas</span>
          </span>
        )}
      </button>

      {montado &&
        createPortal(
          <>
            <div
              aria-hidden
              onClick={() => chatStore.fechar()}
              className={cn(
                "fixed inset-0 z-[55] bg-black/50 transition-opacity lg:bg-black/20",
                aberto ? "opacity-100" : "pointer-events-none opacity-0",
                fixo && "lg:hidden",
              )}
            />
            <aside
              id="painel-chat"
              aria-label="Chat da taverna"
              aria-hidden={!aberto}
              inert={!aberto}
              className={cn(
                "gaveta-moldura fixed inset-y-0 right-0 z-[56] flex w-full flex-col transition-transform duration-300 sm:inset-y-2 sm:right-2 sm:w-[30rem] xl:w-[34rem]",
                aberto ? "translate-x-0" : "translate-x-[110%]",
              )}
              style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <header className="bg-madeira flex items-center gap-2 border-b border-gold/40 px-3 py-2">
                <div className="flex flex-1 gap-1" role="tablist" aria-label="Chat">
                  <AbaBotao ativa={aba === "conversa"} onClick={() => setAba("conversa")}>
                    Conversa
                  </AbaBotao>
                  <AbaBotao ativa={aba === "taverna"} onClick={() => setAba("taverna")}>
                    Na taverna <span className="text-bottle">({quantosOnline} online)</span>
                  </AbaBotao>
                </div>
                <label
                  className={cn(
                    "hidden cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm lg:inline-flex",
                    fixo ? "bg-gold/15 text-wood" : "text-muted-foreground hover:text-parchment",
                  )}
                  title="Deixa o chat aberto ao lado da página, mesmo trocando de tela"
                >
                  <input
                    type="checkbox"
                    checked={fixo}
                    onChange={(e) => alternarFixo(e.target.checked)}
                    className="size-4 accent-[var(--gold)]"
                  />
                  <Pin className="size-4" aria-hidden /> Manter aberto
                </label>
                <button
                  type="button"
                  onClick={() => chatStore.fechar()}
                  aria-label="Fechar chat"
                  className="rounded-md p-1.5 text-parchment hover:bg-white/10"
                >
                  <X className="size-5" />
                </button>
              </header>
              <div className={cn("min-h-0 flex-1", aba === "conversa" ? "flex flex-col" : "hidden")}>
                {aberto && !naPaginaDoChat && <ChatConversa eu={eu} moderacao={moderacao} membros={membros} compacto />}
                {naPaginaDoChat && <p className="p-4 text-muted-foreground">A conversa já está aberta nesta página.</p>}
              </div>
              {aba === "taverna" && <ListaNaTaverna membros={ordenados} online={online} euId={eu.id} />}
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}

function AbaBotao({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 font-display text-lg",
        ativa ? "bg-gold/15 text-wood" : "text-muted-foreground hover:text-parchment",
      )}
    >
      {children}
    </button>
  );
}

/** Quem é da taverna, com quem está online primeiro; "Mencionar" já abre a conversa com @Nome. */
export function ListaNaTaverna({
  membros,
  online,
  euId,
}: {
  membros: MembroChat[];
  online: ReadonlySet<string>;
  euId: string;
}) {
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      {membros.map((m) => (
        <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
          <Avatar
            nome={m.name}
            avatar={m.avatar}
            foto={m.foto}
            cor={m.avatar_color}
            papel={m.papel}
            tamanho={40}
            online={online.has(m.id)}
          />
          <NomeEnfeitado nome={m.name} epiteto={m.epithet} papel={m.papel} mostrarTitulo className="flex-1" />
          {m.id !== euId && (
            <button
              type="button"
              onClick={() => chatStore.escreverPara(`@${m.name} `)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-gold hover:text-wood"
              aria-label={`Mencionar ${m.name}`}
            >
              <AtSign className="size-3.5" aria-hidden /> Mencionar
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
