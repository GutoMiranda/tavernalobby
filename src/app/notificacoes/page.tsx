import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { formatarDataHora } from "@/lib/format";
import { rotuloNotificacao } from "@/lib/notificacoes";
import type { Notificacao } from "@/lib/notificacoes-dados";

import { abrirNotificacao, marcarTodasLidas } from "./actions";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const { supabase } = await exigirMembro();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, message, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Notificacao[]>();
  const lista = data ?? [];
  const naoLidas = lista.filter((n) => !n.read_at).length;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Notificações · avisos</CardTitle>
        <CardDescription>
          {naoLidas === 0 ? "Nenhum aviso novo." : `${naoLidas} ${naoLidas === 1 ? "aviso novo" : "avisos novos"}.`} Os
          100 mais recentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {naoLidas > 0 && (
          <AcaoForm action={marcarTodasLidas} textoBotao="Marcar todas como lidas" variante="outline" tamanho="sm" />
        )}
        {lista.length === 0 ? (
          <p className="text-muted-foreground">Você ainda não recebeu avisos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lista.map((n) => (
              <li key={n.id}>
                <form action={abrirNotificacao}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="link" value={n.link ?? ""} />
                  <button
                    type="submit"
                    className={`w-full rounded-md border p-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      n.read_at ? "border-border bg-surface" : "border-gold bg-gold/10"
                    }`}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{rotuloNotificacao(n.kind)}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!n.read_at && <Badge variant="gold">Novo</Badge>}
                        {formatarDataHora(n.created_at)}
                      </span>
                    </span>
                    <span className="mt-1 block">{n.message}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
