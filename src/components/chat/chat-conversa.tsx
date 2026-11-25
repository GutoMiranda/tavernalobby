"use client";

import { CheckCircle2, CircleHelp, CornerUpLeft, Send, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/personagem/avatar";
import { NomeEnfeitado } from "@/components/personagem/nome-enfeitado";
import { Button } from "@/components/ui/button";
import {
  type FiltroChat,
  filtrarMensagens,
  horaDaMensagem,
  type MensagemChat,
  mencaoEmCurso,
  mencoesNoTexto,
  rotuloDoDia,
  sugerirMembros,
  trechosComMencoes,
} from "@/lib/chat";
import type { Papel } from "@/lib/personagem";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useChatStore } from "./estado-chat";

export type MembroChat = {
  id: string;
  name: string;
  avatar: string | null;
  avatar_color: string | null;
  epithet: string | null;
  foto?: string | null;
  papel: Papel;
};

type Linha = Omit<MensagemChat, "mencoes">;
/** Último pedido de "Mencionar" já colocado no campo (para não repetir ao reabrir o painel). */
let rascunhoUsado = 0;
const COLUNAS = "id, author_person_id, body, is_question, reply_to, resolved_at, deleted_at, created_at";

type Props = {
  eu: MembroChat;
  /** Moderação do chat (Mestre ou tag): marcar dúvidas dos outros e apagar mensagens dos outros. */
  moderacao: { resolver: boolean; apagar: boolean };
  membros: MembroChat[];
  /** Mais compacto no painel lateral. */
  compacto?: boolean;
  /** Mensagem para destacar ao abrir (link do sino: /chat#m-<id>). */
  destacarHash?: boolean;
};

/**
 * Conversa do chat geral: mensagens ao vivo, menções com @, dúvidas (marcar, responder, resolver),
 * filtros e apagar a própria mensagem. Escrita só pelas funções do banco (RLS e permissões lá).
 */
export function ChatConversa({ eu, moderacao, membros, compacto, destacarHash }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroChat>("tudo");
  const [texto, setTexto] = useState("");
  const [pergunta, setPergunta] = useState(false);
  const [resposta, setResposta] = useState<MensagemChat | null>(null);
  const [mencionados, setMencionados] = useState<MembroChat[]>([]);
  const [sugestao, setSugestao] = useState<{ inicio: number; busca: string } | null>(null);
  const [indiceSugestao, setIndiceSugestao] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [destaque, setDestaque] = useState<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const colado = useRef(true);
  const { rascunho } = useChatStore();

  const porId = useMemo(() => new Map(membros.map((m) => [m.id, m])), [membros]);
  const membroDe = useCallback(
    (id: string): MembroChat =>
      porId.get(id) ?? { id, name: "Ex-membro", avatar: null, avatar_color: "pedra", epithet: null, papel: "membro" },
    [porId],
  );

  const comMencoes = useCallback(
    async (linhas: Linha[]): Promise<MensagemChat[]> => {
      if (linhas.length === 0) return [];
      const { data } = await supabase
        .from("chat_mentions")
        .select("message_id, person_id")
        .in(
          "message_id",
          linhas.map((l) => l.id),
        );
      const mapa = new Map<string, string[]>();
      for (const m of data ?? []) mapa.set(m.message_id, [...(mapa.get(m.message_id) ?? []), m.person_id]);
      return linhas.map((l) => ({ ...l, mencoes: mapa.get(l.id) ?? [] }));
    },
    [supabase],
  );

  const juntar = useCallback((novas: MensagemChat[]) => {
    setMensagens((atual) => {
      const mapa = new Map(atual.map((m) => [m.id, m]));
      for (const n of novas) mapa.set(n.id, { ...mapa.get(n.id), ...n });
      return [...mapa.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  // Últimas 150 mensagens + tempo real.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(COLUNAS)
        .order("created_at", { ascending: false })
        .limit(150)
        .returns<Linha[]>();
      if (!ativo) return;
      if (error) {
        setErro("Não foi possível carregar o chat agora.");
        setCarregando(false);
        return;
      }
      juntar(await comMencoes((data ?? []).reverse()));
      setCarregando(false);
    })();

    const canal = supabase
      .channel(`chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (p) => {
        juntar(await comMencoes([p.new as Linha]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (p) => {
        const l = p.new as Linha;
        setMensagens((atual) =>
          atual.map((m) => (m.id === l.id ? { ...m, ...l, mencoes: l.deleted_at ? [] : m.mencoes } : m)),
        );
      })
      .subscribe();
    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [supabase, juntar, comMencoes]);

  // Rolagem: fica no fim quando já estava no fim.
  useLayoutEffect(() => {
    const el = listaRef.current;
    if (el && colado.current && !destaque) el.scrollTop = el.scrollHeight;
  }, [mensagens, filtro, destaque]);

  // Link do sino (/chat#m-<id>): rola até a mensagem e destaca.
  useEffect(() => {
    if (!destacarHash || carregando) return;
    const id = window.location.hash.startsWith("#m-") ? window.location.hash.slice(3) : null;
    if (!id) return;
    setDestaque(id);
    requestAnimationFrame(() => document.getElementById(`m-${id}`)?.scrollIntoView({ block: "center" }));
    const t = setTimeout(() => setDestaque(null), 4000);
    return () => clearTimeout(t);
  }, [destacarHash, carregando]);

  // Pedido de "Mencionar" vindo da lista de quem está na taverna.
  useEffect(() => {
    if (!rascunho || rascunho.n <= rascunhoUsado) return;
    rascunhoUsado = rascunho.n;
    const nome = rascunho.texto.replace(/^@/, "").trim();
    const m = membros.find((x) => x.name === nome);
    setTexto((t) => (t ? `${t} ${rascunho.texto}` : rascunho.texto));
    if (m) setMencionados((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
    requestAnimationFrame(() => campoRef.current?.focus());
  }, [rascunho, membros]);

  const sugestoes = sugestao ? sugerirMembros(sugestao.busca, membros, eu.id) : [];

  function aoDigitar(valor: string, cursor: number) {
    setTexto(valor);
    const s = mencaoEmCurso(valor.slice(0, cursor));
    setSugestao(s);
    setIndiceSugestao(0);
  }

  function escolher(m: MembroChat) {
    if (!sugestao) return;
    const campo = campoRef.current;
    const cursor = campo?.selectionStart ?? texto.length;
    const novo = `${texto.slice(0, sugestao.inicio)}@${m.name} ${texto.slice(cursor)}`;
    setTexto(novo);
    setMencionados((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
    setSugestao(null);
    const pos = sugestao.inicio + m.name.length + 2;
    requestAnimationFrame(() => {
      campo?.focus();
      campo?.setSelectionRange(pos, pos);
    });
  }

  async function enviar() {
    const corpo = texto.trim();
    if (!corpo || enviando) return;
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("post_chat_message", {
      p_body: corpo,
      p_is_question: pergunta,
      p_mentions: mencoesNoTexto(corpo, mencionados),
      p_reply_to: resposta?.id ?? null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message || "Não foi possível enviar.");
      return;
    }
    setTexto("");
    setPergunta(false);
    setResposta(null);
    setMencionados([]);
    colado.current = true;
    if (typeof data === "string") {
      const { data: linha } = await supabase.from("chat_messages").select(COLUNAS).eq("id", data).single<Linha>();
      if (linha) juntar(await comMencoes([linha]));
    }
  }

  async function alternarResolvida(m: MensagemChat) {
    const { error } = await supabase.rpc("toggle_chat_question_resolved", { p_message_id: m.id });
    if (error) setErro(error.message);
    else juntar([{ ...m, resolved_at: m.resolved_at ? null : new Date().toISOString() }]);
  }

  async function apagar(m: MensagemChat) {
    const { error } = await supabase.rpc("delete_chat_message", { p_message_id: m.id });
    if (error) setErro(error.message);
    else juntar([{ ...m, body: "", deleted_at: new Date().toISOString(), mencoes: [] }]);
  }

  const visiveis = filtrarMensagens(mensagens, filtro, eu.id);
  const duvidasAbertas = mensagens.filter((m) => m.is_question && !m.resolved_at && !m.deleted_at).length;
  const porIdMsg = new Map(mensagens.map((m) => [m.id, m]));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2" role="tablist" aria-label="Filtrar">
        {(
          [
            ["tudo", "Tudo"],
            ["duvidas", `Dúvidas abertas${duvidasAbertas ? ` (${duvidasAbertas})` : ""}`],
            ["mencoes", "Me mencionaram"],
          ] as const
        ).map(([f, rotulo]) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filtro === f ? "border-gold bg-gold/15 text-wood" : "border-border text-muted-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div
        ref={listaRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-3", compacto ? "" : "max-h-[70vh]")}
        aria-live="polite"
        aria-relevant="additions"
      >
        {carregando && <p className="py-6 text-center text-muted-foreground">Abrindo a porta da taverna…</p>}
        {!carregando && visiveis.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">
            {filtro === "tudo"
              ? "Ninguém falou nada ainda. Puxe a primeira conversa!"
              : filtro === "duvidas"
                ? "Nenhuma dúvida em aberto."
                : "Ninguém te mencionou por aqui."}
          </p>
        )}
        <ol className="flex flex-col gap-1">
          {visiveis.map((m, i) => {
            const anterior = visiveis[i - 1];
            const dia = rotuloDoDia(m.created_at);
            const novoDia = !anterior || rotuloDoDia(anterior.created_at) !== dia;
            const autor = membroDe(m.author_person_id);
            const agrupar =
              !novoDia &&
              anterior?.author_person_id === m.author_person_id &&
              Date.parse(m.created_at) - Date.parse(anterior.created_at) < 5 * 60_000 &&
              !m.reply_to &&
              !m.is_question;
            const meMencionou = m.mencoes.includes(eu.id);
            const minha = m.author_person_id === eu.id;
            const original = m.reply_to ? porIdMsg.get(m.reply_to) : null;
            return (
              <li key={m.id}>
                {novoDia && (
                  <p className="divisor-quest my-2 text-xs text-muted-foreground" role="separator">
                    {dia}
                  </p>
                )}
                <article
                  id={`m-${m.id}`}
                  className={cn(
                    "group flex scroll-mt-20 gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                    agrupar ? "pt-0" : "mt-1",
                    meMencionou && "bg-gold/10 ring-1 ring-gold/40",
                    m.is_question && !m.resolved_at && !m.deleted_at && "bg-[#2b3a6b]/25 ring-1 ring-[#7d95d9]/40",
                    destaque === m.id && "bg-gold/25 ring-2 ring-gold",
                  )}
                >
                  <div className="w-9 shrink-0">
                    {!agrupar && (
                      <Avatar
                        nome={autor.name}
                        avatar={autor.avatar}
                        foto={autor.foto}
                        cor={autor.avatar_color}
                        papel={autor.papel}
                        tamanho={36}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!agrupar && (
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <NomeEnfeitado
                          nome={autor.name}
                          epiteto={compacto ? null : autor.epithet}
                          papel={autor.papel}
                        />
                        <time dateTime={m.created_at} className="text-xs text-muted-foreground">
                          {horaDaMensagem(m.created_at)}
                        </time>
                      </div>
                    )}
                    {original && (
                      <a
                        href={`#m-${original.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`m-${original.id}`)?.scrollIntoView({ block: "center" });
                        }}
                        className="mt-0.5 mb-1 block truncate border-l-2 border-gold/60 pl-2 text-xs text-muted-foreground hover:text-parchment"
                      >
                        <CornerUpLeft className="mr-1 inline size-3" aria-hidden />
                        {membroDe(original.author_person_id).name}:{" "}
                        {original.deleted_at ? "mensagem apagada" : original.body}
                      </a>
                    )}
                    {m.is_question && !m.deleted_at && (
                      <span
                        className={cn(
                          "mr-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          m.resolved_at ? "bg-bottle/15 text-bottle" : "bg-[#7d95d9]/20 text-[#b9c8f2]",
                        )}
                      >
                        {m.resolved_at ? (
                          <CheckCircle2 className="size-3.5" aria-hidden />
                        ) : (
                          <CircleHelp className="size-3.5" aria-hidden />
                        )}
                        {m.resolved_at ? "Dúvida resolvida" : "Dúvida"}
                      </span>
                    )}
                    {m.deleted_at ? (
                      <p className="text-sm text-muted-foreground italic">Mensagem apagada.</p>
                    ) : (
                      <p className="text-[0.95rem] break-words whitespace-pre-wrap">
                        {trechosComMencoes(
                          m.body,
                          m.mencoes.map((id) => membroDe(id)),
                        ).map((t, j) =>
                          t.mencao ? (
                            <mark
                              key={j}
                              className={cn(
                                "rounded px-0.5 font-semibold",
                                t.mencao === eu.id ? "bg-gold text-on-gold" : "bg-gold/20 text-wood",
                              )}
                            >
                              {t.texto}
                            </mark>
                          ) : (
                            <span key={j}>{t.texto}</span>
                          ),
                        )}
                      </p>
                    )}
                    {!m.deleted_at && (
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground opacity-80 group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-parchment"
                          onClick={() => {
                            setResposta(m);
                            campoRef.current?.focus();
                          }}
                        >
                          <CornerUpLeft className="size-3.5" aria-hidden /> Responder
                        </button>
                        {m.is_question && (minha || moderacao.resolver) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-bottle"
                            onClick={() => alternarResolvida(m)}
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            {m.resolved_at ? "Reabrir dúvida" : "Marcar resolvida"}
                          </button>
                        )}
                        {(minha || moderacao.apagar) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-alert"
                            onClick={() => apagar(m)}
                          >
                            <Trash2 className="size-3.5" aria-hidden /> Apagar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      <form
        className="relative flex flex-col gap-2 border-t border-border bg-black/20 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        {sugestao && sugestoes.length > 0 && (
          <ul
            role="listbox"
            aria-label="Mencionar alguém"
            className="absolute right-3 bottom-full left-3 mb-1 overflow-hidden rounded-xl border border-gold/50 bg-[#231a13] shadow-xl"
          >
            {sugestoes.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === indiceSugestao}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(m)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left",
                    i === indiceSugestao ? "bg-gold/15" : "hover:bg-white/5",
                  )}
                >
                  <Avatar
                    nome={m.name}
                    avatar={m.avatar}
                    foto={m.foto}
                    cor={m.avatar_color}
                    papel={m.papel}
                    tamanho={28}
                  />
                  <NomeEnfeitado nome={m.name} epiteto={m.epithet} papel={m.papel} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {resposta && (
          <div className="flex items-center gap-2 rounded-md border-l-2 border-gold bg-gold/10 px-2 py-1 text-xs">
            <CornerUpLeft className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Respondendo a {membroDe(resposta.author_person_id).name}: {resposta.body}
            </span>
            <button type="button" onClick={() => setResposta(null)} aria-label="Cancelar resposta">
              <X className="size-4" />
            </button>
          </div>
        )}
        <label htmlFor={`chat-campo-${compacto ? "p" : "g"}`} className="sr-only">
          Mensagem para o grupo
        </label>
        <textarea
          id={`chat-campo-${compacto ? "p" : "g"}`}
          ref={campoRef}
          value={texto}
          rows={2}
          maxLength={2000}
          placeholder={
            pergunta ? "Qual a sua dúvida? Use @ para perguntar a alguém." : "Escreva… use @ para chamar alguém"
          }
          onChange={(e) => aoDigitar(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (sugestao && sugestoes.length > 0) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setIndiceSugestao((i) => (i + (e.key === "ArrowDown" ? 1 : sugestoes.length - 1)) % sugestoes.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                escolher(sugestoes[indiceSugestao]);
                return;
              }
              if (e.key === "Escape") {
                setSugestao(null);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          className="max-h-40 min-h-12 w-full resize-y rounded-lg border border-input bg-field px-3 py-2 text-[0.95rem] outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-pressed={pergunta}
            onClick={() => setPergunta((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
              pergunta ? "border-[#7d95d9] bg-[#7d95d9]/20 text-[#d3ddfa]" : "border-border text-muted-foreground",
            )}
          >
            <CircleHelp className="size-4" aria-hidden /> {pergunta ? "É uma dúvida" : "Marcar como dúvida"}
          </button>
          <Button type="submit" size="sm" disabled={enviando || !texto.trim()}>
            <Send aria-hidden /> {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </div>
        {erro && (
          <p role="alert" className="text-sm text-alert">
            {erro}
          </p>
        )}
      </form>
    </div>
  );
}
