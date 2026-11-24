import { AlertTriangle, CalendarClock, FileText, PiggyBank, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AcaoForm } from "@/components/acao-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirMembro } from "@/lib/auth";
import { contagemRegressiva } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { carregarCustos, type ItemCusto } from "@/lib/custos-dados";
import { centavosParaCampo } from "@/lib/dinheiro";
import { type ItemRateio, NOME_CATEGORIA, type ParteRateio, type RateioItem, elegiveis } from "@/lib/finance/rateio";
import { depositosDoNucleo, dividirEmParcelas, nomeDoMes, planoDeEconomia } from "@/lib/finance/economia";
import { formatarCentavos, formatarData, formatarDia, hojeEmSaoPaulo } from "@/lib/format";

import {
  ajustarPeso,
  criarItemCusto,
  custoDaEstalagem,
  editarItemCusto,
  removerItemCusto,
  salvarAdesoes,
} from "../../custos-actions";

export const metadata: Metadata = { title: "Custos" };

const SELECT = "h-10 rounded-md border border-input bg-white px-3 text-base md:text-sm";
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export default async function CustosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const custos = await carregarCustos(supabase, dados);
  const { pessoas, itens, itensRateio, rateio, totalDias, pesos, periodo } = custos;

  const nome = new Map(pessoas.map((p) => [p.id, p.name]));
  const doMeuNucleo = pessoas.filter((p) => p.household_id === pessoa.household_id);
  const minhaParteNucleo = rateio.porNucleo.get(pessoa.household_id) ?? 0;
  const hoje = hojeEmSaoPaulo();
  const inicio = periodo?.inicio ?? null;
  const contagem = contagemRegressiva(inicio, hoje);
  const deposito = depositosDoNucleo(custos.lancamentos, pessoa.household_id);
  const plano = planoDeEconomia(minhaParteNucleo, deposito.confirmadoCentavos, hoje, inicio);
  const porAdulto = doMeuNucleo
    .map((p) => ({ id: p.id, nome: p.name, parte: rateio.porPessoa.get(p.id) ?? 0 }))
    .filter((a) => a.parte > 0)
    .map((a) => ({
      ...a,
      porMes:
        dividirEmParcelas(
          a.parte,
          plano.parcelas.map((x) => x.mes),
        )[0]?.centavos ?? a.parte,
    }));
  const meusLancamentos = custos.lancamentos.filter(
    (l) => l.kind === "entrada" && l.household_id === pessoa.household_id,
  );
  const comprovantes = await Promise.all(
    meusLancamentos
      .filter((l) => l.receipt_path)
      .map(async (l) => {
        const { data } = await supabase.storage.from("comprovantes").createSignedUrl(l.receipt_path!, 3600);
        return { ...l, link: data?.signedUrl ?? null };
      }),
  );
  const nomeNucleo = new Map(dados.nucleos.map((n) => [n.id, n.name]));
  const porNucleo = [...rateio.porNucleo.entries()].sort((a, b) => b[1] - a[1]);
  const ninguemConfirmou = !custos.pessoas.some((p) => custos.presencas.get(p.id)?.status === "vai");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="size-5 text-bottle" aria-hidden /> Sua meta até a aventura
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <CalendarClock className="size-4" aria-hidden />
            {periodo
              ? `${contagem ?? "A aventura já começou"} · começa em ${formatarDia(periodo.inicio)}${
                  periodo.fonte === "mais_votada" ? " (prévia: data mais votada, até o admin fechar a data)" : ""
                }`
              : "Ainda não há datas candidatas; o plano mensal aparece quando houver uma."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Resumo da sua meta">
            <Indicador rotulo="Minha parte (núcleo)" valor={formatarCentavos(minhaParteNucleo)} />
            <Indicador
              rotulo="Já enviei ao baú"
              valor={formatarCentavos(deposito.confirmadoCentavos)}
              detalhe="confirmado pelo tesoureiro"
            />
            <Indicador rotulo="Aguardando confirmação" valor={formatarCentavos(deposito.pendenteCentavos)} />
            <Indicador
              rotulo="Falta"
              valor={formatarCentavos(plano.faltaCentavos)}
              destaque={plano.faltaCentavos > 0}
            />
            <Indicador
              rotulo="Guardar por mês"
              valor={formatarCentavos(plano.porMesCentavos)}
              detalhe={
                plano.meses
                  ? `${plano.meses} ${plano.meses === 1 ? "mês" : "meses"}: ${nomeDoMes(plano.parcelas[0].mes)} a ${nomeDoMes(plano.parcelas[plano.parcelas.length - 1].mes)}`
                  : "sem data definida"
              }
              destaque
            />
            <Indicador
              rotulo="Progresso"
              valor={`${minhaParteNucleo ? Math.min(100, Math.floor((deposito.confirmadoCentavos * 100) / minhaParteNucleo)) : 0}%`}
              detalhe="da sua parte"
            />
          </ul>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-2 font-medium">
                <FileText className="size-4" aria-hidden /> Meus depósitos e comprovantes
              </p>
              {meusLancamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum depósito registrado ainda.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {meusLancamentos.map((l) => {
                    const c = comprovantes.find((x) => x.id === l.id);
                    return (
                      <li key={l.id} className="flex flex-wrap justify-between gap-2">
                        <span>
                          {formatarDia(l.occurred_on)} · {formatarCentavos(l.amount_cents)} ·{" "}
                          {l.status === "confirmado"
                            ? "confirmado"
                            : l.status === "pendente"
                              ? "aguardando"
                              : "recusado"}
                        </span>
                        {c?.link && (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bottle underline underline-offset-4"
                          >
                            Ver comprovante
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="rounded-md bg-white/50 p-3 text-sm">
              <p className="font-medium">Plano mês a mês</p>
              {plano.faltaCentavos === 0 ? (
                <p>Sua parte está coberta. Loot guardado!</p>
              ) : plano.parcelas.length === 0 ? (
                <p>Quando as datas forem fechadas, o valor que falta é dividido pelos meses até a viagem.</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    O que falta ({formatarCentavos(plano.faltaCentavos)}) dividido pelos meses do mês atual até o mês
                    anterior ao da viagem. Centavos que não dividem certinho vão para os primeiros meses; a soma fecha
                    exatamente.
                  </p>
                  <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
                    {plano.parcelas.map((p) => (
                      <li key={p.mes} className="flex justify-between gap-2">
                        <span>{nomeDoMes(p.mes)}</span>
                        <span className="font-medium">{formatarCentavos(p.centavos)}</span>
                      </li>
                    ))}
                  </ol>
                  {porAdulto.length > 1 && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="font-medium">Por pessoa do núcleo (referência, sem descontar depósitos)</p>
                      <ul>
                        {porAdulto.map((a) => (
                          <li key={a.id}>
                            {a.nome}: parte de {formatarCentavos(a.parte)} → {formatarCentavos(a.porMes)} por mês
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <p className="mt-2 text-muted-foreground">
                O envio de depósitos com comprovante e os lembretes chegam com o Baú (próxima etapa).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gold/60 lg:col-span-2">
        <CardHeader>
          <CardDescription>Minha parte · {doMeuNucleo.length > 1 ? "seu núcleo inteiro" : "você"}</CardDescription>
          <CardTitle className="text-3xl">{formatarCentavos(minhaParteNucleo)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ninguemConfirmou && (
            <p className="flex items-center gap-2 text-sm text-alert">
              <AlertTriangle className="size-4" aria-hidden /> Ninguém confirmou presença ainda. A divisão só aparece
              depois das confirmações, em{" "}
              <Link href={`/aventuras/${id}/presenca`} className="underline underline-offset-4">
                Presença
              </Link>
              .
            </p>
          )}
          <MemoriaDeCalculo
            pessoas={doMeuNucleo.map((p) => ({ id: p.id, nome: p.name }))}
            rateio={rateio.itens}
            itens={itensRateio}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-bottle" aria-hidden /> Total da aventura
          </CardTitle>
          <CardDescription>
            {formatarCentavos(rateio.totalCentavos)} em {itens.length} {itens.length === 1 ? "item" : "itens"}
            {totalDias
              ? ` · ${totalDias} dias${periodo?.fonte === "mais_votada" ? " (prévia)" : ""}`
              : " · datas a definir"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {porNucleo.length === 0 ? (
            <p className="text-sm text-muted-foreground">A parte de cada núcleo aparece aqui.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm" aria-label="Parte de cada núcleo">
              {porNucleo.map(([nid, v]) => (
                <li key={nid} className="flex justify-between gap-2">
                  <span className={nid === pessoa.household_id ? "font-medium" : undefined}>
                    {nomeNucleo.get(nid) ?? "Núcleo"}
                  </span>
                  <span>{formatarCentavos(v)}</span>
                </li>
              ))}
            </ul>
          )}
          {rateio.semParticipantes.length > 0 && (
            <p className="mt-3 flex gap-2 text-sm text-alert">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {rateio.semParticipantes.length}{" "}
              {rateio.semParticipantes.length === 1 ? "item ainda não tem" : "itens ainda não têm"} quem divida (ninguém
              elegível confirmou).
            </p>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3 lg:col-span-3" aria-labelledby="titulo-itens">
        <h2 id="titulo-itens" className="font-display text-xl font-semibold text-wood">
          Itens de custo
        </h2>
        {itens.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum custo cadastrado ainda.{pessoa.is_admin ? "" : " O Mestre da Taverna (admin) vai lançar."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {itens.map((item) => {
              const ir = itensRateio.find((i) => i.id === item.id)!;
              const r = rateio.itens.find((x) => x.itemId === item.id)!;
              const pesosItem = pesos.filter((w) => w.cost_item_id === item.id);
              const optIn = item.category === "extra" && item.eligibility === "opt_in";
              const meusAdultosQueVao = doMeuNucleo.filter(
                (p) => !p.is_child && custos.presencas.get(p.id)?.status === "vai",
              );
              return (
                <li key={item.id}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{NOME_CATEGORIA[item.category]}</Badge>
                        {optIn && <Badge variant="outline">Opt-in</Badge>}
                        {item.automatico && <Badge>Automático</Badge>}
                      </CardDescription>
                      <CardTitle className="text-lg">{item.description}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                      <p className="text-xl font-semibold">{formatarCentavos(item.amount_cents)}</p>
                      <p className="text-muted-foreground">
                        {r.regra} · {r.partes.length} {r.partes.length === 1 ? "pessoa" : "pessoas"}
                      </p>
                      {pesosItem.length > 0 && (
                        <ul className="text-xs text-muted-foreground">
                          {pesosItem.map((w) => (
                            <li key={w.person_id}>
                              Peso de {nome.get(w.person_id) ?? "alguém"}: {num(Number(w.weight))} (ajustado por{" "}
                              {nome.get(w.updated_by ?? "") ?? "admin"} em {formatarData(w.updated_at)})
                            </li>
                          ))}
                        </ul>
                      )}

                      {optIn && meusAdultosQueVao.length > 0 && (
                        <AcaoForm action={salvarAdesoes} textoBotao="Salvar adesão" tamanho="sm">
                          <input type="hidden" name="evento" value={id} />
                          <input type="hidden" name="item" value={item.id} />
                          <fieldset className="flex flex-col gap-1">
                            <legend className="font-medium">Quem do seu núcleo participa?</legend>
                            {meusAdultosQueVao.map((p) => (
                              <label key={p.id} className="flex items-center gap-2">
                                <input type="hidden" name="pessoa" value={p.id} />
                                <input
                                  type="checkbox"
                                  name={`aderir_${p.id}`}
                                  defaultChecked={ir.adesoes.includes(p.id)}
                                  className="size-5 accent-bottle"
                                />
                                {p.name}
                              </label>
                            ))}
                          </fieldset>
                        </AcaoForm>
                      )}

                      {item.automatico && (
                        <p className="text-xs text-muted-foreground">
                          {item.automatico === "mais_votada"
                            ? "Prévia com a estalagem mais votada. Quando o admin escolher a estalagem, a conta passa a usar a escolhida."
                            : "Calculado com o preço da estalagem escolhida."}
                        </p>
                      )}
                      {pessoa.is_admin && item.automatico === "escolhida" && (
                        <AcaoForm
                          action={custoDaEstalagem}
                          textoBotao="Fixar como item (para ajustar pesos)"
                          variante="outline"
                          tamanho="sm"
                        >
                          <input type="hidden" name="evento" value={id} />
                        </AcaoForm>
                      )}
                      {pessoa.is_admin && !item.automatico && (
                        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-2">
                          <details>
                            <summary className="cursor-pointer font-medium text-bottle">Editar item</summary>
                            <div className="mt-2">
                              <FormItem eventoId={id} item={item} acao="editar" />
                            </div>
                          </details>
                          <details>
                            <summary className="cursor-pointer font-medium text-bottle">Ajustar peso de alguém</summary>
                            <FormPeso
                              eventoId={id}
                              itemId={item.id}
                              partes={r.partes}
                              pessoas={elegiveis(ir, custos.pessoasRateio).map((x) => ({ id: x.id, nome: x.nome }))}
                            />
                          </details>
                          <AcaoForm
                            action={removerItemCusto}
                            textoBotao="Remover item"
                            variante="ghost"
                            tamanho="sm"
                            textoEnviando="…"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pessoa.is_admin && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Adicionar custo</CardTitle>
            <CardDescription>
              Só o admin lança custos. A divisão segue a regra da categoria: acomodação proporcional aos dias, comida
              igual entre presentes, álcool só para quem marcou opt-in, e extras para todos ou só quem aderir.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormItem eventoId={id} acao="criar" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <li className={`rounded-md border p-3 ${destaque ? "border-gold bg-gold/10" : "border-border bg-white/50"}`}>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className="text-xl font-semibold text-wood">{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </li>
  );
}

function FormItem({ eventoId, item, acao }: { eventoId: string; item?: ItemCusto; acao: "criar" | "editar" }) {
  const p = item?.id ?? "novo";
  return (
    <AcaoForm
      action={acao === "criar" ? criarItemCusto : editarItemCusto}
      textoBotao={acao === "criar" ? "Adicionar custo" : "Salvar item"}
      limparAoConcluir={acao === "criar"}
    >
      <input type="hidden" name="evento" value={eventoId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${p}`}>Categoria</Label>
          <select id={`cat-${p}`} name="categoria" defaultValue={item?.category ?? "acomodacao"} className={SELECT}>
            <option value="acomodacao">Acomodação</option>
            <option value="alimentacao">Alimentação e bebidas não alcoólicas</option>
            <option value="alcool">Bebidas alcoólicas</option>
            <option value="extra">Extra (passeio, gás, limpeza…)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`valor-${p}`}>Valor (R$)</Label>
          <Input
            id={`valor-${p}`}
            name="valor"
            inputMode="decimal"
            required
            defaultValue={item ? centavosParaCampo(item.amount_cents) : ""}
            placeholder="Ex.: 3.000,00"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`desc-${p}`}>Descrição</Label>
          <Input
            id={`desc-${p}`}
            name="descricao"
            required
            maxLength={200}
            defaultValue={item?.description ?? ""}
            placeholder="Ex.: Mercado do sábado"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="proporcional"
          defaultChecked={item ? item.proportional_to_days : true}
          className="size-5 accent-bottle"
        />
        Proporcional aos dias de cada um (o padrão da acomodação; desmarque para dividir igual)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="opt_in"
          defaultChecked={item?.eligibility === "opt_in"}
          className="size-5 accent-bottle"
        />
        Só para quem aderir (vale para extras)
      </label>
    </AcaoForm>
  );
}

function FormPeso({
  eventoId,
  itemId,
  partes,
  pessoas,
}: {
  eventoId: string;
  itemId: string;
  partes: ParteRateio[];
  pessoas: { id: string; nome: string }[];
}) {
  if (pessoas.length === 0) return <p className="mt-2 text-muted-foreground">Ninguém elegível ainda.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      <li id={`peso-ajuda-${itemId}`} className="text-xs text-muted-foreground">
        1 = parte normal; 0,5 = meia parte; 0 = não paga este item.
      </li>
      {pessoas.map((p) => {
        const parte = partes.find((x) => x.pessoaId === p.id);
        return (
          <li key={p.id}>
            <AcaoForm action={ajustarPeso} textoBotao="Salvar" tamanho="sm" className="flex-row items-end gap-2">
              <input type="hidden" name="evento" value={eventoId} />
              <input type="hidden" name="item" value={itemId} />
              <input type="hidden" name="pessoa" value={p.id} />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`peso-${itemId}-${p.id}`}>{p.nome}</Label>
                <Input
                  id={`peso-${itemId}-${p.id}`}
                  name="peso"
                  inputMode="decimal"
                  className="w-24"
                  defaultValue={num(parte?.peso ?? 0)}
                  aria-describedby={`peso-ajuda-${itemId}`}
                />
              </div>
            </AcaoForm>
          </li>
        );
      })}
    </ul>
  );
}

function MemoriaDeCalculo({
  pessoas,
  rateio,
  itens,
}: {
  pessoas: { id: string; nome: string }[];
  rateio: RateioItem[];
  itens: ItemRateio[];
}) {
  const linhas = pessoas.map((p) => ({
    ...p,
    partes: rateio
      .map((r) => ({
        r,
        item: itens.find((i) => i.id === r.itemId)!,
        parte: r.partes.find((x) => x.pessoaId === p.id),
      }))
      .filter((x) => x.parte),
  }));
  if (linhas.every((l) => l.partes.length === 0)) return null;
  return (
    <details className="rounded-md border border-border p-3" open>
      <summary className="cursor-pointer font-medium">Memória de cálculo</summary>
      <div className="mt-2 flex flex-col gap-3">
        {linhas
          .filter((l) => l.partes.length > 0)
          .map((l) => (
            <div key={l.id}>
              <p className="font-medium">{l.nome}</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {l.partes.map(({ r, item, parte }) => (
                  <li key={r.itemId} className="rounded bg-white/50 p-2">
                    <div className="flex justify-between gap-2">
                      <span>{item.descricao}</span>
                      <strong>{formatarCentavos(parte!.centavos)}</strong>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.regra}: {formatarCentavos(item.valorCentavos)} ×{" "}
                      {item.proporcionalDias
                        ? `${parte!.dias} ${parte!.dias === 1 ? "dia" : "dias"}${parte!.peso !== 1 ? ` × peso ${num(parte!.peso)}` : ""}`
                        : parte!.peso !== 1
                          ? `peso ${num(parte!.peso)}`
                          : "1"}{" "}
                      ÷ {num(r.baseTotal)}{" "}
                      {item.proporcionalDias ? "dias-pessoa" : r.partes.length === 1 ? "pessoa" : "partes"}
                      {parte!.ajusteCentavos !== 0 &&
                        ` · ajuste de arredondamento ${parte!.ajusteCentavos > 0 ? "+" : "−"}${formatarCentavos(Math.abs(parte!.ajusteCentavos))}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </details>
  );
}
