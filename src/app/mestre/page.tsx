import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSalao } from "@/lib/auth";
import { FASE_INFO } from "@/lib/aventura";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";
import { formatarPeriodo } from "@/lib/format";
import { AREA_INFO, areasVisiveis } from "@/lib/permissoes";

import { primeiraAreaDaAventura } from "./areas";

export const metadata: Metadata = { title: "Painel" };

export default async function SalaoPage() {
  const { supabase, pessoa, permissoes } = await exigirSalao();
  const [{ data: eventos }, aguardando, depositos, cobrancas] = await Promise.all([
    supabase.from("events").select(COLUNAS_EVENTO).order("created_at", { ascending: false }).returns<Evento[]>(),
    permissoes.membros.ver
      ? supabase
          .from("people")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .not("user_id", "is", null)
      : Promise.resolve({ count: 0 }),
    permissoes.bau.ver
      ? supabase
          .from("fund_transactions")
          .select("id", { count: "exact", head: true })
          .eq("kind", "entrada")
          .eq("status", "pendente")
      : Promise.resolve({ count: 0 }),
    permissoes.bau.ver
      ? supabase.from("pix_checkouts").select("id", { count: "exact", head: true }).eq("status", "aberto")
      : Promise.resolve({ count: 0 }),
  ]);

  const tarefas = [
    permissoes.membros.ver && (aguardando.count ?? 0) > 0
      ? {
          texto: `${aguardando.count} ${aguardando.count === 1 ? "pessoa aguardando" : "pessoas aguardando"} aprovação`,
          href: "/mestre/membros",
        }
      : null,
    permissoes.bau.ver && (depositos.count ?? 0) > 0
      ? {
          texto: `${depositos.count} ${depositos.count === 1 ? "depósito pendente" : "depósitos pendentes"} para conferir no Baú`,
          href: null,
        }
      : null,
    permissoes.bau.ver && (cobrancas.count ?? 0) > 0
      ? {
          texto: `${cobrancas.count} ${cobrancas.count === 1 ? "cobrança Pix aberta" : "cobranças Pix abertas"}`,
          href: null,
        }
      : null,
  ].filter((t) => t !== null);

  const areas = areasVisiveis(permissoes);
  const lista = eventos ?? [];
  const area = primeiraAreaDaAventura(permissoes);

  return (
    <div className="grade-taverna">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Aventuras</CardTitle>
            <CardDescription>
              Escolha a aventura para gerenciar datas, estalagens, presença, custos e baú.
            </CardDescription>
          </div>
          {permissoes.aventura.editar && (
            <Button asChild className="brilho-vela">
              <Link href="/mestre/aventuras/nova">
                <Plus aria-hidden /> Nova aventura
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma aventura ainda.</p>
          ) : !area ? (
            <p className="text-muted-foreground">Suas tags não dão acesso às abas das aventuras.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lista.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/mestre/aventuras/${e.id}/${area}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold text-parchment">{e.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.start_date && e.end_date ? formatarPeriodo(e.start_date, e.end_date) : "data a definir"}
                      </p>
                    </div>
                    <Badge variant={e.phase === "cancelada" ? "destructive" : "gold"}>{FASE_INFO[e.phase].nome}</Badge>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pendências do salão</CardTitle>
          </CardHeader>
          <CardContent>
            {tarefas.length === 0 ? (
              <p className="text-muted-foreground">Tudo em ordem por aqui. Pode servir mais uma rodada.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tarefas.map((t) => (
                  <li key={t.texto} className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
                    {t.href ? (
                      <Link href={t.href} className="text-wood underline-offset-2 hover:underline">
                        {t.texto}
                      </Link>
                    ) : (
                      t.texto
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{pessoa.is_admin ? "Você pode tudo" : "O que você pode aqui"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {areas.map((a) => {
                const p = permissoes[a];
                const acoes = ["ver", p.editar && "editar", p.excluir && "excluir"].filter(Boolean).join(", ");
                return (
                  <li key={a}>
                    <Badge variant="outline">
                      {AREA_INFO[a].nome}: {acoes}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
