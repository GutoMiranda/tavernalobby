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

import { adicionarData, fecharDatas, removerData } from "@/app/aventuras/actions";

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
          <CardTitle>Votação de datas</CardTitle>
          <CardDescription>
            Curta as datas que dão certo para você e descurta as que não dão. O ranking é pelo saldo (curtidas menos
            descurtidas).
            {evento.date_vote_deadline && ` Prazo: ${formatarData(evento.date_vote_deadline)}.`}
          </CardDescription>
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
                    {(perm.editar || perm.excluir) && !fechada && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                        {perm.editar && (
                          <AcaoForm
                            action={fecharDatas}
                            textoBotao="Fechar com esta data"
                            tamanho="sm"
                            textoEnviando="Fechando…"
                          >
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
                        )}
                        {perm.excluir && (
                          <AcaoForm
                            action={removerData}
                            textoBotao="Remover"
                            variante="ghost"
                            tamanho="sm"
                            textoEnviando="…"
                          >
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
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

      {perm.editar && !fechada && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Adicionar data candidata</CardTitle>
            <CardDescription>A party vota nas datas da aba Datas; aqui você cadastra e fecha.</CardDescription>
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
