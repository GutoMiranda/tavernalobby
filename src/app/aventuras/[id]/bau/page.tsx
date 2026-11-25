import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ExternalLink,
  History,
  Undo2,
} from "lucide-react";
import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { BarraDaMeta } from "@/components/bau/barra-da-meta";
import { PilhaDeOuro } from "@/components/bau/pilha-de-ouro";
import { TesouroVivo } from "@/components/bau/tesouro-vivo";
import { IconeBau, IconeCoroa, IconeMoedas } from "@/components/icones";
import { CampoComprovante } from "@/components/bau/campo-comprovante";
import { DepositoPix } from "@/components/bau/deposito-pix";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirMembro } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { carregarCustos } from "@/lib/custos-dados";
import { centavosParaCampo } from "@/lib/dinheiro";
import { avisoPixAtivo, lembreteDoPlano, saldoDoBau } from "@/lib/finance/bau";
import { depositosDoNucleo, planoDeEconomia, valoresDoDeposito } from "@/lib/finance/economia";
import { formatarCentavos, formatarData, formatarDataHora, formatarDia, hojeEmSaoPaulo } from "@/lib/format";
import { handleInfinitePay } from "@/lib/infinitepay";

import {
  abrirBau,
  confirmarDeposito,
  estornarLancamento,
  cancelarCobranca,
  confirmarCobrancaManual,
  pagarComInfinitePay,
  recusarDeposito,
  registrarDeposito,
  registrarSaida,
  removerPlano,
  salvarDadosPix,
  salvarMeta,
  salvarPlano,
} from "../../bau-actions";

export const metadata: Metadata = { title: "Baú" };

type Fundo = {
  id: string;
  bank: string | null;
  holder: string | null;
  pix_key: string | null;
  goal_cents: number | null;
  pix_changed_at: string | null;
};
type Historico = {
  id: string;
  changed_by: string | null;
  changed_at: string;
  old_bank: string | null;
  new_bank: string | null;
  old_holder: string | null;
  new_holder: string | null;
  old_pix_key: string | null;
  new_pix_key: string | null;
};
type Lanc = {
  id: string;
  kind: "entrada" | "saida" | "estorno";
  household_id: string | null;
  amount_cents: number;
  occurred_on: string;
  description: string | null;
  receipt_path: string | null;
  status: "pendente" | "confirmado" | "recusado";
  reverses_id: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  external_receipt_url: string | null;
  created_at: string;
};
type Cobranca = {
  id: string;
  amount_cents: number;
  checkout_url: string;
  created_at: string;
  created_by: string;
  household_id: string;
};

export default async function BauPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pix?: string }>;
}) {
  const { id } = await params;
  const { pix: retornoPix } = await searchParams;
  const pixAutomatico = handleInfinitePay() != null;
  const { supabase, pessoa, user, tags } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const custos = await carregarCustos(supabase, dados);
  const tesoureiro = tags.includes("Tesoureiro");
  const hoje = hojeEmSaoPaulo();

  const { data: fundo } = await supabase
    .from("funds")
    .select("id, bank, holder, pix_key, goal_cents, pix_changed_at")
    .eq("event_id", id)
    .maybeSingle<Fundo>();

  if (!fundo) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeBau className="text-gold" /> Baú · caixinha
          </CardTitle>
          <CardDescription>
            O dinheiro fica numa conta real de um membro (ex.: cofrinho de banco digital). O site não guarda nem
            movimenta dinheiro: ele controla e mostra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pessoa.is_admin ? (
            <AcaoForm action={abrirBau} textoBotao="Abrir o baú desta aventura">
              <input type="hidden" name="evento" value={id} />
            </AcaoForm>
          ) : (
            <p className="text-muted-foreground">O Mestre da Taverna (admin) ainda não abriu o baú desta aventura.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const [lancR, histR, planosR, cobrancasR] = await Promise.all([
    supabase
      .from("fund_transactions")
      .select(
        "id, kind, household_id, amount_cents, occurred_on, description, receipt_path, status, reverses_id, created_by, reviewed_by, review_note, external_receipt_url, created_at",
      )
      .eq("fund_id", fundo.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Lanc[]>(),
    supabase
      .from("fund_settings_history")
      .select("id, changed_by, changed_at, old_bank, new_bank, old_holder, new_holder, old_pix_key, new_pix_key")
      .eq("fund_id", fundo.id)
      .order("changed_at", { ascending: false })
      .returns<Historico[]>(),
    supabase
      .from("deposit_plans")
      .select("household_id, amount_cents, day_of_month")
      .eq("fund_id", fundo.id)
      .returns<{ household_id: string; amount_cents: number; day_of_month: number }[]>(),
    supabase
      .from("pix_checkouts")
      .select("id, amount_cents, checkout_url, created_at, created_by, household_id")
      .eq("fund_id", fundo.id)
      .eq("status", "aberto")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Cobranca[]>(),
  ]);
  const todasAbertas = cobrancasR.data ?? [];
  const limiteMinhas = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const cobrancasAbertas = todasAbertas
    .filter((c) => c.created_by === pessoa.id && c.created_at >= limiteMinhas)
    .slice(0, 5);
  const confereCobrancas = tesoureiro || pessoa.is_admin;
  const lancamentos = lancR.data ?? [];
  const historico = histR.data ?? [];
  const meuPlano = (planosR.data ?? []).find((p) => p.household_id === pessoa.household_id);

  const nomePessoa = new Map(custos.pessoas.map((p) => [p.id, p.name]));
  const nomeNucleo = new Map(dados.nucleos.map((n) => [n.id, n.name]));
  const { saldoCentavos, entradasCentavos, saidasCentavos } = saldoDoBau(lancamentos);
  const meta = fundo.goal_cents ?? custos.rateio.totalCentavos;
  const progresso = meta > 0 ? Math.min(100, Math.floor((entradasCentavos * 100) / meta)) : 0;
  const estornados = new Set(lancamentos.filter((l) => l.kind === "estorno").map((l) => l.reverses_id));
  const pendentes = lancamentos.filter((l) => l.kind === "entrada" && l.status === "pendente");

  const minhaParte = custos.rateio.porNucleo.get(pessoa.household_id) ?? 0;
  const meuDeposito = depositosDoNucleo(lancamentos, pessoa.household_id);
  const plano = planoDeEconomia(minhaParte, meuDeposito.confirmadoCentavos, hoje, custos.periodo?.inicio ?? null);
  const lembrete = meuPlano
    ? lembreteDoPlano(
        meuPlano,
        lancamentos.filter((l) => l.household_id === pessoa.household_id),
        hoje,
      )
    : null;
  const valorSugerido = meuPlano?.amount_cents ?? plano.porMesCentavos;

  const valores = valoresDoDeposito(plano.faltaCentavos, valorSugerido, hoje, custos.periodo?.inicio ?? null);

  const links = new Map(
    await Promise.all(
      lancamentos
        .filter((l) => l.receipt_path)
        .map(async (l) => {
          const { data } = await supabase.storage.from("comprovantes").createSignedUrl(l.receipt_path!, 3600);
          return [l.id, data?.signedUrl ?? null] as const;
        }),
    ),
  );

  const nucleosComParte = [...custos.rateio.porNucleo.entries()]
    .map(([nid, parte]) => ({ nid, parte, ...depositosDoNucleo(lancamentos, nid) }))
    .sort((a, b) => (nomeNucleo.get(a.nid) ?? "").localeCompare(nomeNucleo.get(b.nid) ?? ""));

  return (
    <div className="grade-taverna">
      {avisoPixAtivo(fundo.pix_changed_at) && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border-2 border-alert bg-alert/10 p-4 text-alert lg:col-span-3"
        >
          <AlertTriangle className="size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">
              Atenção: os dados de pagamento do baú mudaram em {formatarData(fundo.pix_changed_at!)}.
            </p>
            <p className="text-sm">
              Confira banco, titular e chave Pix abaixo antes de depositar. Veja o histórico de alterações no fim da
              página.
            </p>
          </div>
        </div>
      )}

      {retornoPix === "ok" && (
        <div
          role="status"
          className="flex gap-3 rounded-lg border-2 border-bottle bg-bottle/10 p-4 text-bottle lg:col-span-3"
        >
          <CheckCircle2 className="size-6 shrink-0" aria-hidden />
          <p className="font-semibold">Pix confirmado pela InfinitePay. Loot guardado no baú!</p>
        </div>
      )}
      {retornoPix === "pendente" && (
        <div role="status" className="flex gap-3 rounded-lg border-2 border-gold bg-gold/10 p-4 lg:col-span-3">
          <AlertTriangle className="size-6 shrink-0 text-gold" aria-hidden />
          <p>
            Ainda não recebemos a confirmação do pagamento. Se você já pagou, ele entra sozinho em alguns minutos. Se
            não pagou, use “Continuar pagamento” abaixo.
          </p>
        </div>
      )}

      <TesouroVivo
        fundoId={fundo.id}
        confirmados={lancamentos.filter((l) => l.kind === "entrada" && l.status === "confirmado").map((l) => l.id)}
        progresso={progresso}
        nomesNucleo={Object.fromEntries(nomeNucleo)}
        celebrarAoAbrir={retornoPix === "ok"}
      />

      <Card className="lg:col-span-2" moldura={progresso >= 100 ? "verde" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeMoedas className="text-gold" /> Pilha de tesouro
          </CardTitle>
          <CardDescription>
            Saldo confirmado = entradas confirmadas − saídas (estornos já considerados).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-8">
            <PilhaDeOuro progresso={meta > 0 ? (entradasCentavos * 100) / meta : 0} className="sm:w-64 sm:shrink-0" />
            <div className="flex flex-col items-center gap-2 sm:items-start">
              {progresso >= 100 && (
                <p className="selo-meta inline-flex items-center gap-2 rounded-full border-2 border-gold bg-gold/15 px-4 py-1 font-display text-lg text-wood">
                  <IconeCoroa className="size-6 text-gold" /> Meta alcançada!
                </p>
              )}
              <p className="text-sm text-muted-foreground">Saldo no baú</p>
              <p className="font-display text-5xl font-bold text-wood drop-shadow-[0_0_18px_rgb(242_165_65/0.35)]">
                {formatarCentavos(saldoCentavos)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2 text-sm">
              <span>
                Arrecadado {formatarCentavos(entradasCentavos)} de {formatarCentavos(meta)}
                {fundo.goal_cents == null && " (soma dos custos)"}
              </span>
              <span className="font-display text-lg text-gold">{progresso}%</span>
            </div>
            <BarraDaMeta progresso={progresso} />
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Entradas</p>
              <p className="font-semibold">{formatarCentavos(entradasCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Saídas</p>
              <p className="font-semibold">{formatarCentavos(saidasCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Aguardando confirmação</p>
              <p className="font-semibold">{formatarCentavos(pendentes.reduce((s, l) => s + l.amount_cents, 0))}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Falta para a meta</p>
              <p className="font-semibold">{formatarCentavos(Math.max(0, meta - entradasCentavos))}</p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-bottle/60 lg:row-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeMoedas className="text-gold" /> Depositar no baú
          </CardTitle>
          <CardDescription>
            Escolha quanto vai guardar e pague por Pix. Confira o titular antes de confirmar no app do banco.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!fundo.pix_key && !pixAutomatico ? (
            <p className="text-muted-foreground">O admin ainda não cadastrou a chave Pix.</p>
          ) : (
            <DepositoPix
              evento={id}
              fundo={fundo.id}
              chave={fundo.pix_key}
              titular={fundo.holder}
              banco={fundo.bank}
              automatico={pixAutomatico}
              porMesCentavos={valores.porMesCentavos}
              porSemanaCentavos={valores.porSemanaCentavos}
              porDiaCentavos={valores.porDiaCentavos}
              acao={pagarComInfinitePay}
            />
          )}
          {cobrancasAbertas.length > 0 && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium">Pagamentos começados e ainda não confirmados</p>
              <ul className="flex flex-col gap-2">
                {cobrancasAbertas.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface p-2"
                  >
                    <span>
                      {formatarCentavos(c.amount_cents)} · {formatarDataHora(c.created_at)}
                    </span>
                    <a
                      href={c.checkout_url}
                      className="inline-flex items-center gap-1 text-bottle underline underline-offset-4"
                    >
                      Continuar pagamento <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground">Se já pagou, a confirmação chega sozinha. Não pague duas vezes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="size-5 text-bottle" aria-hidden />{" "}
            {pixAutomatico ? "Paguei por fora (enviar comprovante)" : "Registrar depósito"}
          </CardTitle>
          <CardDescription>
            Depois de fazer o Pix, registre aqui. Fica “aguardando” até o Tesoureiro confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={registrarDeposito} textoBotao="Registrar depósito" limparAoConcluir>
            <input type="hidden" name="evento" value={id} />
            <input type="hidden" name="fundo" value={fundo.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dep-valor">Valor (R$)</Label>
                <Input id="dep-valor" name="valor" inputMode="decimal" required placeholder="0,00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dep-data">Data</Label>
                <Input id="dep-data" name="data" type="date" required max={hoje} defaultValue={hoje} />
              </div>
            </div>
            <CampoComprovante userId={user.id} />
          </AcaoForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano de depósitos do seu núcleo</CardTitle>
          <CardDescription>
            Combine um valor e um dia do mês. O site lembra seu núcleo a partir desse dia, até o depósito do mês ser
            registrado. Sugestão para cobrir sua parte: {formatarCentavos(plano.porMesCentavos)} por mês
            {plano.meses ? ` por ${plano.meses} ${plano.meses === 1 ? "mês" : "meses"}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lembrete && (
            <p
              className={`rounded-md p-2 text-sm ${lembrete.situacao === "atrasado" ? "bg-alert/10 font-medium text-alert" : "bg-surface"}`}
            >
              {lembrete.situacao === "atrasado"
                ? `Depósito do mês pendente: ${formatarCentavos(lembrete.valorCentavos)} (combinado para ${formatarDia(lembrete.data)}).`
                : lembrete.situacao === "feito"
                  ? `Depósito deste mês registrado. Próximo: ${formatarCentavos(lembrete.valorCentavos)} em ${formatarDia(lembrete.data)}.`
                  : `Próximo depósito: ${formatarCentavos(lembrete.valorCentavos)} em ${formatarDia(lembrete.data)}.`}
            </p>
          )}
          <AcaoForm action={salvarPlano} textoBotao={meuPlano ? "Atualizar plano" : "Criar plano"}>
            <input type="hidden" name="evento" value={id} />
            <input type="hidden" name="fundo" value={fundo.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plano-valor">Valor por mês (R$)</Label>
                <Input
                  id="plano-valor"
                  name="valor"
                  inputMode="decimal"
                  required
                  defaultValue={centavosParaCampo(meuPlano?.amount_cents ?? plano.porMesCentavos)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plano-dia">Dia do mês</Label>
                <Input
                  id="plano-dia"
                  name="dia"
                  type="number"
                  min={1}
                  max={28}
                  required
                  defaultValue={meuPlano?.day_of_month ?? 10}
                />
              </div>
            </div>
          </AcaoForm>
          {meuPlano && (
            <AcaoForm action={removerPlano} textoBotao="Remover plano" variante="ghost" tamanho="sm" textoEnviando="…">
              <input type="hidden" name="evento" value={id} />
              <input type="hidden" name="fundo" value={fundo.id} />
            </AcaoForm>
          )}
          <p className="text-xs text-muted-foreground">
            Pix automático (débito automático) exige contrato pago com banco; por isso o site usa lembrete + QR Pix.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por núcleo</CardTitle>
          <CardDescription>Parte de cada núcleo nos custos e quanto já foi confirmado.</CardDescription>
        </CardHeader>
        <CardContent>
          {nucleosComParte.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aparece quando houver custos e presenças confirmadas.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {nucleosComParte.map((n) => {
                const falta = Math.max(0, n.parte - n.confirmadoCentavos);
                return (
                  <li key={n.nid} className="flex flex-col">
                    <span className={n.nid === pessoa.household_id ? "font-semibold" : "font-medium"}>
                      {nomeNucleo.get(n.nid) ?? "Núcleo"}
                    </span>
                    <span className="text-muted-foreground">
                      {formatarCentavos(n.confirmadoCentavos)} de {formatarCentavos(n.parte)} ·{" "}
                      {falta === 0 ? "parte coberta ✓" : `faltam ${formatarCentavos(falta)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {confereCobrancas && todasAbertas.length > 0 && (
        <Card className="border-gold/60 lg:col-span-3">
          <CardHeader>
            <CardTitle>Pix pela InfinitePay sem confirmação ({todasAbertas.length})</CardTitle>
            <CardDescription>
              Pagamentos começados no site que ainda não confirmaram sozinhos. Se não foi pago, cancele. Abra o app da
              InfinitePay em “Suas vendas” (filtro “Checkout integrado”) e confirme só o que aparecer lá com o mesmo
              valor e horário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-2">
              {todasAbertas.map((c) => (
                <li key={c.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <p className="font-medium">
                    {formatarCentavos(c.amount_cents)} · {nomeNucleo.get(c.household_id) ?? "Núcleo"}
                  </p>
                  <p className="text-muted-foreground">
                    Começado por {nomePessoa.get(c.created_by) ?? "alguém"} em {formatarDataHora(c.created_at)}
                  </p>
                  <AcaoForm
                    action={confirmarCobrancaManual}
                    textoBotao="Confirmar: vi na InfinitePay"
                    tamanho="sm"
                    textoEnviando="…"
                    className="mt-2"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="evento" value={id} />
                  </AcaoForm>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-alert">Cancelar (não foi pago)</summary>
                    <AcaoForm
                      action={cancelarCobranca}
                      textoBotao="Confirmar cancelamento"
                      variante="destructive"
                      tamanho="sm"
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="evento" value={id} />
                      <p className="text-xs text-muted-foreground">
                        A cobrança some da lista e fica no histórico como cancelada. Se o pagamento aparecer depois, ele
                        ainda entra no baú.
                      </p>
                    </AcaoForm>
                  </details>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {tesoureiro && (
        <Card className="border-gold/60 lg:col-span-3">
          <CardHeader>
            <CardTitle>Guardião do Baú · tesoureiro</CardTitle>
            <CardDescription>
              Confira cada depósito no extrato antes de confirmar. Nada é apagado: erros viram estorno.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="pend">
              <h3 id="pend" className="mb-2 font-medium">
                Depósitos aguardando ({pendentes.length})
              </h3>
              {pendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada pendente.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {pendentes.map((l) => (
                    <li key={l.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                      <p className="font-medium">
                        {formatarCentavos(l.amount_cents)} · {nomeNucleo.get(l.household_id ?? "") ?? "Núcleo"} ·{" "}
                        {formatarDia(l.occurred_on)}
                      </p>
                      <p className="text-muted-foreground">
                        Registrado por {nomePessoa.get(l.created_by ?? "") ?? "alguém"}
                        {links.get(l.id) && (
                          <>
                            {" · "}
                            <a
                              href={links.get(l.id)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bottle underline"
                            >
                              ver comprovante
                            </a>
                          </>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-end gap-3">
                        <AcaoForm action={confirmarDeposito} textoBotao="Confirmar" tamanho="sm" textoEnviando="…">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="evento" value={id} />
                        </AcaoForm>
                        <details>
                          <summary className="cursor-pointer text-alert">Recusar</summary>
                          <AcaoForm
                            action={recusarDeposito}
                            textoBotao="Recusar depósito"
                            variante="destructive"
                            tamanho="sm"
                            className="mt-2"
                          >
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="evento" value={id} />
                            <Label htmlFor={`motivo-${l.id}`}>Motivo</Label>
                            <Input
                              id={`motivo-${l.id}`}
                              name="motivo"
                              required
                              maxLength={300}
                              placeholder="Ex.: não apareceu no extrato"
                            />
                          </AcaoForm>
                        </details>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="saida">
              <h3 id="saida" className="mb-2 flex items-center gap-2 font-medium">
                <ArrowUpCircle className="size-4 text-alert" aria-hidden /> Registrar saída (pagamento com o dinheiro do
                baú)
              </h3>
              <AcaoForm action={registrarSaida} textoBotao="Registrar saída" limparAoConcluir>
                <input type="hidden" name="evento" value={id} />
                <input type="hidden" name="fundo" value={fundo.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sai-valor">Valor (R$)</Label>
                    <Input id="sai-valor" name="valor" inputMode="decimal" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sai-data">Data</Label>
                    <Input id="sai-data" name="data" type="date" required max={hoje} defaultValue={hoje} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sai-desc">Descrição</Label>
                  <Input id="sai-desc" name="descricao" required maxLength={200} placeholder="Ex.: sinal da casa" />
                </div>
                <CampoComprovante userId={user.id} />
              </AcaoForm>
            </section>
          </CardContent>
        </Card>
      )}

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5 text-bottle" aria-hidden /> Histórico do baú
          </CardTitle>
          <CardDescription>Todos os lançamentos, visíveis a todos. Nada é apagado.</CardDescription>
        </CardHeader>
        <CardContent>
          {lancamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {lancamentos.map((l) => {
                const podeEstornar =
                  (tesoureiro || pessoa.is_admin) &&
                  l.kind !== "estorno" &&
                  l.status === "confirmado" &&
                  !estornados.has(l.id);
                return (
                  <li key={l.id} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {l.kind === "saida" ||
                        (l.kind === "estorno" && lancamentos.find((x) => x.id === l.reverses_id)?.kind === "entrada")
                          ? "−"
                          : "+"}
                        {formatarCentavos(l.amount_cents)}
                      </span>
                      <span className="flex gap-1">
                        <Badge variant="outline">
                          {l.kind === "entrada" ? "Depósito" : l.kind === "saida" ? "Saída" : "Estorno"}
                        </Badge>
                        {l.kind !== "estorno" && (
                          <Badge
                            variant={
                              l.status === "confirmado"
                                ? "default"
                                : l.status === "recusado"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {l.status === "confirmado"
                              ? "Confirmado"
                              : l.status === "recusado"
                                ? "Recusado"
                                : "Aguardando"}
                          </Badge>
                        )}
                        {estornados.has(l.id) && <Badge variant="destructive">Estornado</Badge>}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {formatarDia(l.occurred_on)}
                      {l.household_id && ` · ${nomeNucleo.get(l.household_id) ?? "Núcleo"}`}
                      {l.created_by && ` · por ${nomePessoa.get(l.created_by) ?? "alguém"}`}
                    </p>
                    {l.description && <p>{l.kind === "estorno" ? `Motivo: ${l.description}` : l.description}</p>}
                    {l.review_note && <p className="text-alert">Recusado: {l.review_note}</p>}
                    {links.get(l.id) && (
                      <a
                        href={links.get(l.id)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bottle underline underline-offset-4"
                      >
                        Ver comprovante
                      </a>
                    )}
                    {l.external_receipt_url && (
                      <a
                        href={l.external_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bottle underline underline-offset-4"
                      >
                        Ver recibo da InfinitePay
                      </a>
                    )}
                    {podeEstornar && (
                      <details>
                        <summary className="flex cursor-pointer items-center gap-1 text-alert">
                          <Undo2 className="size-4" aria-hidden /> Estornar
                        </summary>
                        <AcaoForm
                          action={estornarLancamento}
                          textoBotao="Confirmar estorno"
                          variante="destructive"
                          tamanho="sm"
                          className="mt-2"
                        >
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="evento" value={id} />
                          <Label htmlFor={`est-${l.id}`}>Motivo</Label>
                          <Input id={`est-${l.id}`} name="motivo" required maxLength={300} />
                        </AcaoForm>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {pessoa.is_admin && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configuração do baú (admin)</CardTitle>
            <CardDescription>
              Trocar banco ou chave Pix grava histórico, avisa todos no site e por e-mail e mostra um alerta aqui por 7
              dias.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <AcaoForm action={salvarDadosPix} textoBotao="Salvar dados de pagamento">
              <input type="hidden" name="evento" value={id} />
              <input type="hidden" name="fundo" value={fundo.id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-banco">Banco</Label>
                <Input
                  id="cfg-banco"
                  name="banco"
                  maxLength={80}
                  defaultValue={fundo.bank ?? ""}
                  placeholder="Ex.: Nubank (caixinha)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-titular">Titular</Label>
                <Input id="cfg-titular" name="titular" maxLength={80} defaultValue={fundo.holder ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-chave">Chave Pix</Label>
                <Input
                  id="cfg-chave"
                  name="chave"
                  required
                  maxLength={120}
                  defaultValue={fundo.pix_key ?? ""}
                  aria-describedby="cfg-chave-ajuda"
                />
                <p id="cfg-chave-ajuda" className="text-xs text-muted-foreground">
                  E-mail, CPF (só números), telefone no formato +5511999998888 ou chave aleatória.
                </p>
              </div>
            </AcaoForm>
            <AcaoForm action={salvarMeta} textoBotao="Salvar meta">
              <input type="hidden" name="evento" value={id} />
              <input type="hidden" name="fundo" value={fundo.id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-meta">Meta total (R$)</Label>
                <Input
                  id="cfg-meta"
                  name="meta"
                  inputMode="decimal"
                  defaultValue={fundo.goal_cents != null ? centavosParaCampo(fundo.goal_cents) : ""}
                  placeholder={`Vazio = soma dos custos (${formatarCentavos(custos.rateio.totalCentavos)})`}
                />
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      )}

      <Card className={pessoa.is_admin ? undefined : "lg:col-span-3"}>
        <CardHeader>
          <CardTitle>Alterações de banco e Pix</CardTitle>
          <CardDescription>Histórico permanente.</CardDescription>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {historico.map((h) => (
                <li key={h.id} className="rounded-md bg-surface p-2">
                  <p className="font-medium">
                    {formatarData(h.changed_at)} · {nomePessoa.get(h.changed_by ?? "") ?? "admin"}
                  </p>
                  {h.old_pix_key !== h.new_pix_key && (
                    <p>
                      Chave: {h.old_pix_key ?? "—"} → {h.new_pix_key ?? "—"}
                    </p>
                  )}
                  {h.old_bank !== h.new_bank && (
                    <p>
                      Banco: {h.old_bank ?? "—"} → {h.new_bank ?? "—"}
                    </p>
                  )}
                  {h.old_holder !== h.new_holder && (
                    <p>
                      Titular: {h.old_holder ?? "—"} → {h.new_holder ?? "—"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
