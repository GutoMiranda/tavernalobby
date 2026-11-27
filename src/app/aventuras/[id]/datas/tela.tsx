import { Dica } from "@/components/dica";
import { Ajuda } from "@/components/ajuda";
import { AcaoForm } from "@/components/acao-form";
import { ReacaoBotoes } from "@/components/aventura/reacao-botoes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ranking } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { LinkSalao } from "@/components/mestre/link-salao";
import { contextoDaTela } from "@/lib/telas";
import { diasDoPeriodo, formatarData, formatarPeriodo } from "@/lib/format";

import { adicionarData, editarData, fecharDatas, reabrirDatas, removerData } from "@/app/aventuras/actions";

export async function TelaDatas({ id, gerenciar }: { id: string; gerenciar: boolean }) {
  const { supabase, pessoa, perm, atalhoSalao } = await contextoDaTela("datas", gerenciar);
  const { evento, datas, reacoesDatas } = await carregarAventura(supabase, id);
  const lista = ranking(datas, reacoesDatas, pessoa.id);
  const fechada = !!evento.chosen_date_option_id;

  return (
    <div className="flex flex-col gap-4">
      {atalhoSalao && <LinkSalao href={`/mestre/aventuras/${id}/datas`} />}
      <Card>
        <CardHeader>
          <CardTitle>
            Votação de datas{" "}
            <Dica>
              Curta (polegar para cima) todas as datas em que você pode ir e descurta as que não dá. Pode votar em
              várias. Ganha a que tiver mais curtidas menos descurtidas; quem organiza fecha a data.
            </Dica>
          </CardTitle>
          <Ajuda
            resumo={
              evento.date_vote_deadline
                ? `Curta as que dão certo, descurte as que não dão. Prazo: ${formatarData(evento.date_vote_deadline)}.`
                : "Curta as que dão certo, descurte as que não dão."
            }
          >
            O ranking é pelo saldo: curtidas menos descurtidas.
          </Ajuda>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma data candidata ainda. Quem organiza vai cadastrar.</p>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((d) => {
                const rotulo = formatarPeriodo(d.start_date, d.end_date);
                const escolhida = d.id === evento.chosen_date_option_id;
                return (
                  <li
                    key={d.id}
                    className={`flex flex-col gap-2 rounded-lg border p-3 ${escolhida ? "border-bottle bg-bottle/10" : "border-border bg-surface"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold text-wood">{d.posicao}º</span>
                      <span className="font-medium">{rotulo}</span>
                      <span className="text-sm text-muted-foreground">
                        · {diasDoPeriodo(d.start_date, d.end_date)}{" "}
                        {diasDoPeriodo(d.start_date, d.end_date) === 1 ? "dia" : "dias"}
                      </span>
                      {escolhida && <Badge>Data escolhida</Badge>}
                    </div>
                    {d.note && <p className="text-sm text-muted-foreground">Motivo: {d.note}</p>}
                    <ReacaoBotoes
                      tipo="data"
                      alvoId={d.id}
                      eventoId={id}
                      placar={d.placar}
                      rotulo={rotulo}
                      desativado={fechada}
                    />
                    {(perm.editar || perm.excluir) && (
                      <div className="flex flex-col gap-2 border-t border-border pt-2">
                        <div className="flex flex-wrap gap-2">
                          {perm.editar && !escolhida && (
                            <AcaoForm
                              action={fecharDatas}
                              textoBotao={fechada ? "Trocar para esta data" : "Fechar com esta data"}
                              tamanho="sm"
                              textoEnviando="Salvando…"
                            >
                              <input type="hidden" name="id" value={d.id} />
                              <input type="hidden" name="evento" value={id} />
                            </AcaoForm>
                          )}
                          {perm.editar && escolhida && (
                            <AcaoForm
                              action={reabrirDatas}
                              textoBotao="Reabrir votação"
                              variante="outline"
                              tamanho="sm"
                              textoEnviando="Reabrindo…"
                            >
                              <input type="hidden" name="evento" value={id} />
                            </AcaoForm>
                          )}
                        </div>
                        {perm.editar && (
                          <details className="rounded-md border border-border p-2">
                            <summary className="cursor-pointer text-sm font-medium text-wood">Editar esta data</summary>
                            <AcaoForm action={editarData} textoBotao="Salvar data" tamanho="sm" className="mt-2">
                              <input type="hidden" name="id" value={d.id} />
                              <input type="hidden" name="evento" value={id} />
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                  <Label htmlFor={`ini-${d.id}`}>Início</Label>
                                  <Input
                                    id={`ini-${d.id}`}
                                    name="inicio"
                                    type="date"
                                    required
                                    defaultValue={d.start_date}
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label htmlFor={`fim-${d.id}`}>Fim</Label>
                                  <Input id={`fim-${d.id}`} name="fim" type="date" defaultValue={d.end_date} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Label htmlFor={`nota-${d.id}`}>Motivo (opcional)</Label>
                                <Input id={`nota-${d.id}`} name="nota" maxLength={200} defaultValue={d.note ?? ""} />
                              </div>
                              {escolhida && (
                                <p className="text-xs text-muted-foreground">
                                  É a data definida: o período da aventura, custos e presença passam a usar a nova data.
                                </p>
                              )}
                            </AcaoForm>
                          </details>
                        )}
                        {perm.excluir && (
                          <details className="rounded-md border border-alert/40 p-2">
                            <summary className="cursor-pointer text-sm font-medium text-alert">
                              Excluir esta data
                            </summary>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {escolhida
                                ? "É a data definida: a aventura fica sem data até escolherem outra. Os votos desta data somem."
                                : "Os votos desta data somem."}
                            </p>
                            <AcaoForm
                              action={removerData}
                              textoBotao="Confirmar exclusão"
                              variante="destructive"
                              tamanho="sm"
                              textoEnviando="Excluindo…"
                              className="mt-2"
                            >
                              <input type="hidden" name="id" value={d.id} />
                              <input type="hidden" name="evento" value={id} />
                            </AcaoForm>
                          </details>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {perm.editar && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Adicionar data candidata</CardTitle>
            <CardDescription>
              {fechada
                ? "A data já foi definida, mas você pode cadastrar outra opção e trocar."
                : "A party vota nas datas da aba Datas; aqui você cadastra e fecha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AcaoForm action={adicionarData} textoBotao="Adicionar data" limparAoConcluir>
              <input type="hidden" name="evento" value={id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="inicio">Início</Label>
                  <Input id="inicio" name="inicio" type="date" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fim">Fim</Label>
                  <Input id="fim" name="fim" type="date" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nota">Motivo (opcional)</Label>
                <Input id="nota" name="nota" maxLength={200} placeholder="Ex.: feriado prolongado" />
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
