import { CalendarClock, CheckCircle2, ListTodo, Map as IconeMapa } from "lucide-react";
import Link from "next/link";

import { CopiarBotao } from "@/components/copiar-botao";
import {
  type EncontroPainel,
  type EstalagemPainel,
  type OrigemPainel,
  PainelMapa,
} from "@/components/mapas/painel-mapa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { FASE_INFO, pendencias, ranking } from "@/lib/aventura";
import { carregarAventura, nomeDoPonto } from "@/lib/aventura-dados";
import { carregarCustos } from "@/lib/custos-dados";
import { lembreteDoPlano } from "@/lib/finance/bau";
import { formatarCentavos, formatarData, formatarPeriodo, hojeEmSaoPaulo } from "@/lib/format";
import { type ModoRota, type RotaResumo, rotasEmCache } from "@/lib/rotas";
import { origemDaRota } from "@/lib/viagem";

const MODOS: ModoRota[] = ["DRIVE", "TWO_WHEELER", "TRANSIT", "WALK"];

export default async function PainelAventuraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estalagem?: string; de?: string }>;
}) {
  const { id } = await params;
  const { estalagem: estalagemPedida, de: dePedido } = await searchParams;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;

  const meuNucleo = dados.nucleos.find((n) => n.id === pessoa.household_id);
  const custos = await carregarCustos(supabase, dados);
  const minhaParte = custos.rateio.porNucleo.get(pessoa.household_id) ?? 0;
  const presencasPendentes = custos.pessoas.filter(
    (p) => p.household_id === pessoa.household_id && (custos.presencas.get(p.id)?.status ?? "pendente") === "pendente",
  ).length;
  const minhas = pendencias({
    eventoId: id,
    fase: evento.phase,
    minhaPessoaId: pessoa.id,
    podeCadastrarDatas: (await getPermissoes()).datas.editar,
    datas: dados.datas,
    reacoesDatas: dados.reacoesDatas,
    estalagens: dados.estalagens,
    reacoesEstalagens: dados.reacoesEstalagens,
    nucleoTemOrigem: !!meuNucleo?.origin_text,
    presencasPendentes,
    depositoAtrasado: (() => {
      const plano = custos.planos.find((x) => x.household_id === pessoa.household_id);
      if (!plano) return null;
      const l = lembreteDoPlano(
        plano,
        custos.lancamentos.filter((x) => x.household_id === pessoa.household_id),
        hojeEmSaoPaulo(),
      );
      return l.situacao === "atrasado" ? formatarCentavos(l.valorCentavos) : null;
    })(),
  });

  const datasRanking = ranking(dados.datas, dados.reacoesDatas);
  const estalagensRanking = ranking(dados.estalagens, dados.reacoesEstalagens);
  const escolhida = dados.estalagens.find((e) => e.id === evento.chosen_accommodation_id);
  const lider = escolhida ?? estalagensRanking[0];
  const prazo =
    evento.phase === "datas"
      ? evento.date_vote_deadline
      : evento.phase === "estalagens"
        ? evento.accommodation_vote_deadline
        : null;

  const origens: OrigemPainel[] = dados.nucleos
    .filter((n) => n.origin_lat != null && n.origin_lng != null)
    .map((n) => ({
      id: n.id,
      nome: n.name,
      detalhe: n.origin_text ?? undefined,
      lat: n.origin_lat!,
      lng: n.origin_lng!,
      minha: n.id === pessoa.household_id,
    }));
  const encontros: EncontroPainel[] = dados.pontos
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ id: p.id, nome: nomeDoPonto(p), detalhe: p.address ?? undefined, lat: p.lat!, lng: p.lng! }));
  const estalagensPainel: EstalagemPainel[] = estalagensRanking.map((e) => ({
    id: e.id,
    nome: e.name,
    preco: formatarCentavos(e.total_price_cents),
    capacidade: e.capacity,
    foto: e.photos[0],
    posicao: e.posicao,
    curtidas: e.placar.curtidas,
    descurtidas: e.placar.descurtidas,
    escolhida: e.id === evento.chosen_accommodation_id,
    lat: e.lat,
    lng: e.lng,
  }));
  // A rota só aparece depois que a pessoa toca numa estalagem, e sai de um ponto só (cidade ou encontro).
  const alvo = dados.estalagens.find((e) => e.id === estalagemPedida) ?? null;
  const minhaOrigem = origens.find((o) => o.minha);
  const saida = origemDaRota(
    dePedido,
    !!minhaOrigem,
    encontros.map((e) => e.id),
  );
  const pontoDeSaida = saida === "cidade" ? minhaOrigem : encontros.find((e) => `encontro:${e.id}` === saida);
  let rotas: RotaResumo[] | null = null;
  if (alvo?.lat != null && alvo.lng != null && pontoDeSaida) {
    const destino = { lat: alvo.lat, lng: alvo.lng };
    rotas = await rotasEmCache(pontoDeSaida, destino, MODOS).catch(() => []);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const convite = [
    `⚔️ Nova aventura na Taverna O Lobby: *${evento.name}*`,
    evento.region ? `Região: ${evento.region}` : null,
    evento.start_date && evento.end_date
      ? `Quando: ${formatarPeriodo(evento.start_date, evento.end_date)}`
      : "Vote nas datas!",
    `${base}/aventuras/${id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="grade-taverna">
      <Card className="border-gold/60">
        <CardHeader>
          <CardDescription>Fase atual · {FASE_INFO[evento.phase].nome}</CardDescription>
          <CardTitle>Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>{FASE_INFO[evento.phase].proximoPasso}</p>
          {!evento.start_date && prazo && (
            <p className="flex items-center gap-2 font-medium text-wood">
              <CalendarClock className="size-5 text-bottle" aria-hidden />
              Prazo da votação: {formatarData(prazo)}
            </p>
          )}
          {evento.description && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">{evento.description}</p>
          )}
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
        <CardContent className="grid gap-4">
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
          {custos.itens.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Minha parte (seu núcleo)</p>
              <p className="font-medium">
                <Link href={`/aventuras/${id}/custos`} className="text-bottle underline underline-offset-4">
                  {formatarCentavos(minhaParte)}
                </Link>{" "}
                <span className="text-sm text-muted-foreground">
                  de {formatarCentavos(custos.rateio.totalCentavos)}
                </span>
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">
              {dados.pontos.length > 1 ? "Pontos de encontro" : "Ponto de encontro"}
            </p>
            {dados.pontos.length > 0 ? (
              <ul>
                {dados.pontos.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{nomeDoPonto(p)}</span>
                    {p.meet_at && (
                      <span className="text-sm text-muted-foreground">
                        {" · "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(p.meet_at))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Ainda não definido.{" "}
                <Link href={`/aventuras/${id}/geral`} className="text-bottle underline underline-offset-4">
                  Ver aba Geral
                </Link>
              </p>
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
                <p className="text-sm text-muted-foreground">{formatarCentavos(lider.total_price_cents)} no total</p>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma estalagem sugerida ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeMapa className="size-5 text-bottle" aria-hidden /> Mapa e rotas
          </CardTitle>
          <CardDescription>Toque numa estalagem para ver a rota.</CardDescription>
        </CardHeader>
        <CardContent>
          <PainelMapa
            origens={origens}
            encontros={encontros}
            estalagens={estalagensPainel}
            selecionada={alvo?.id ?? null}
            saida={saida}
            rotas={rotas}
          />
        </CardContent>
      </Card>
    </div>
  );
}
