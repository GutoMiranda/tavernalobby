"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { chatStore } from "@/components/chat/estado-chat";
import { Gaveta } from "@/components/gaveta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/format";
import { linkSeguro, rotuloNotificacao } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Aviso = {
  id: string;
  kind: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Sino com o número de avisos não lidos. Abre os avisos numa gaveta lateral (sem trocar de página);
 * atualiza na hora quando chega um aviso (Supabase Realtime).
 */
export function SinoNotificacoes({ pessoaId, naoLidas }: { pessoaId: string; naoLidas: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [aberta, setAberta] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, message, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Aviso[]>();
    setAvisos(data ?? []);
  }, [supabase]);

  useEffect(() => {
    const ch = supabase
      .channel(`sino-${pessoaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_person_id=eq.${pessoaId}` },
        () => {
          router.refresh();
          setAvisos(null);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pessoaId, router, supabase]);

  useEffect(() => {
    if (aberta && avisos === null) carregar();
  }, [aberta, avisos, carregar]);

  const fechar = useCallback(() => setAberta(false), []);

  async function abrir(a: Aviso) {
    if (!a.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", a.id);
      router.refresh();
    }
    setAberta(false);
    setAvisos(null);
    const destino = linkSeguro(a.link);
    // Avisos do chat abrem a gaveta do chat (sem trocar de página).
    if (destino.startsWith("/chat")) chatStore.abrir();
    else router.push(destino);
  }

  async function lerTodas() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    router.refresh();
    carregar();
  }

  const rotulo = naoLidas ? `Notificações: ${naoLidas} ${naoLidas === 1 ? "nova" : "novas"}` : "Notificações";
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-label={rotulo}
        aria-expanded={aberta}
        aria-controls="gaveta-avisos"
        title={rotulo}
        className="relative rounded-md p-2 text-parchment hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <Bell className="size-6" aria-hidden />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-alert px-1 text-xs font-bold text-on-gold">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      <Gaveta
        id="gaveta-avisos"
        titulo="Notificações · avisos"
        aberta={aberta}
        onFechar={fechar}
        rodape={
          <div className="flex items-center justify-between gap-2">
            <Link href="/notificacoes" onClick={fechar} className="text-sm text-bottle underline underline-offset-4">
              Ver histórico completo
            </Link>
            {avisos?.some((a) => !a.read_at) && (
              <Button type="button" size="sm" variant="outline" onClick={lerTodas}>
                <CheckCheck aria-hidden /> Marcar todas como lidas
              </Button>
            )}
          </div>
        }
      >
        {avisos === null ? (
          <p className="p-4 text-muted-foreground">Buscando avisos…</p>
        ) : avisos.length === 0 ? (
          <p className="p-4 text-muted-foreground">Você ainda não recebeu avisos.</p>
        ) : (
          <ul className="flex flex-col gap-2 p-3">
            {avisos.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => abrir(a)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                    a.read_at ? "border-border bg-surface/60" : "border-gold bg-gold/10",
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-wood">{rotuloNotificacao(a.kind)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {!a.read_at && <Badge variant="gold">Novo</Badge>}
                      {formatarDataHora(a.created_at)}
                    </span>
                  </span>
                  <span className="mt-1 block">{a.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Gaveta>
    </>
  );
}
