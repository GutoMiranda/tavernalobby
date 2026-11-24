import { CalendarClock, CheckCircle2, ListTodo } from "lucide-react";
import Link from "next/link";

import { CopiarBotao } from "@/components/copiar-botao";
import { type PontoMapa, MapaAventura } from "@/components/mapas/mapa-aventura";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { contagemRegressiva, custoPorAdulto, FASE_INFO, pendencias, ranking } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarCentavos, formatarData, formatarPeriodo } from "@/lib/format";

export default async function PainelAventuraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;

  const meuNucleo = dados.nucleos.find((n) => n.id === pessoa.household_id);
  const minhas = pendencias({
    eventoId: id,
    fase: evento.phase,
    minhaPessoaId: pessoa.id,
    souAdmin: pessoa.is_admin,
    datas: dados.datas,
    reacoesDatas: dados.reacoesDatas,
    estalagens: dados.estalagens,
    reacoesEstalagens: dados.reacoesEstalagens,
    nucleoTemOrigem: !!meuNucleo?.origin_text,
  });

  const contagem = contagemRegressiva(evento.start_date);
  const datasRanking = ranking(dados.datas, dados.reacoesDatas);
  const estalagensRanking = ranking(dados.estalagens, dados.reacoesEstalagens);
  const escolhida = dados.estalagens.find((e) => e.id === evento.chosen_accommodation_id);
  const lider = escolhida ?? estalagensRanking[0];
  const prazo =
    evento.phase === "datas" ? evento.date_vote_deadline : evento.phase === "estalagens" ? evento.accommodation_vote_deadline : null;

  const pontos: PontoMapa[] = [
    ...dados.nucleos
      .filter((n) => n.origin_lat != null && n.origin_lng != null)
      .map((n) => ({
        id: `n-${n.id}`,
        tipo: "origem" as const,
        nome: n.name,
        detalhe: n.origin_text ?? undefined,
        lat: n.origin_lat!,
        lng: n.origin_lng!,
      })),
    ...dados.estalagens
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({
        id: `e-${e.id}`,
        tipo: "estalagem" as const,
        nome: e.name,
        detalhe: formatarCentavos(e.total_price_cents),
        lat: e.lat!,
        lng: e.lng!,
        escolhida: e.id === evento.chosen_accommodation_id,
      })),
  ];

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const convite = [
    `⚔️ Nova aventura na Taverna O Lobby: *${evento.name}*`,
    evento.region ? `Região: ${evento.region}` : null,
    evento.start_date && evento.end_date ? `Quando: ${formatarPeriodo(evento.start_date, evento.end_date)}` : "Vote nas datas!",
    `${base}/aventuras/${id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-gold/60">
        <CardHeader>
          <CardDescription>Fase atual · {FASE_INFO[evento.phase].nome}</CardDescription>
          <CardTitle>Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>{FASE_INFO[evento.phase].proximoPasso}</p>
          {(contagem || prazo) && (
            <p className="flex items-center gap-2 font-medium text-wood">
              <CalendarClock className="size-5 text-bottle" aria-hidden />
              {contagem ?? `Prazo da votação: ${formatarData(prazo!)}`}
            </p>
          )}
          {evento.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{evento.description}</p>}
          <div>
            <CopiarBotao texto={convite} rotulo="Copiar convite para o WhatsApp" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="size-5 text-bottle" aria-hidden /> Minhas pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {minhas.length === 0 ? (
            <p className="flex items-center gap-2 text-bottle">
              <CheckCircle2 className="size-5" aria-hidden /> Tudo em dia! Pode pedir mais uma rodada.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {minhas.map((p) => (
                <li key={p.texto}>
                  <Link href={p.href} className="font-medium text-bottle underline underline-offset-4">
                    {p.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Data</p>
            {evento.start_date && evento.end_date ? (
              <p className="font-medium">{formatarPeriodo(evento.start_date, evento.end_date)}</p>
            ) : datasRanking[0] ? (
              <p className="font-medium">
                Liderando: {formatarPeriodo(datasRanking[0].start_date, datasRanking[0].end_date)} (saldo{" "}
                {datasRanking[0].placar.saldo})
              </p>
            ) : (
              <p className="text-muted-foreground">Sem datas candidatas ainda.</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{escolhida ? "Estalagem escolhida" : "Estalagem"}</p>
            {lider ? (
              <>
                <p className="font-medium">
                  {escolhida ? "" : "Liderando: "}
                  {lider.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatarCentavos(lider.total_price_cents)} no total
                  {custoPorAdulto(lider.total_price_cents, dados.adultosParaEstimativa) !== null &&
                    ` · cerca de ${formatarCentavos(custoPorAdulto(lider.total_price_cents, dados.adultosParaEstimativa)!)} por adulto`}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma estalagem sugerida ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa</CardTitle>
          <CardDescription>De onde cada núcleo sai e onde ficam as estalagens.</CardDescription>
        </CardHeader>
        <CardContent>
          <MapaAventura pontos={pontos} />
        </CardContent>
      </Card>
    </div>
  );
}
