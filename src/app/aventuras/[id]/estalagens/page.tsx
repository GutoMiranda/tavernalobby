import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { ReacaoBotoes } from "@/components/aventura/reacao-botoes";
import { CampoLugar } from "@/components/mapas/campo-lugar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirMembro } from "@/lib/auth";
import { custoPorAdulto, ranking } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarCentavos, formatarData } from "@/lib/format";

import { adicionarEstalagem, escolherEstalagem, removerEstalagem } from "../../actions";

export const metadata: Metadata = { title: "Estalagens" };

const classeTextarea =
  "rounded-md border border-input bg-white px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";

export default async function EstalagensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;
  const lista = ranking(dados.estalagens, dados.reacoesEstalagens, pessoa.id);
  const escolhida = evento.chosen_accommodation_id;
  const base = dados.adultosConfirmados ? `${dados.adultosConfirmados} adultos confirmados` : `${dados.adultosDoGrupo} adultos do grupo`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Estalagens · hospedagens</CardTitle>
          <CardDescription>
            Qualquer membro sugere. Curta ou descurta; o Mestre da Taverna (admin) escolhe a final. Custo por pessoa
            estimado dividindo o preço total entre {base} (crianças não pagam).
            {evento.accommodation_vote_deadline && ` Prazo: ${formatarData(evento.accommodation_vote_deadline)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma estalagem sugerida ainda. Seja o primeiro a achar uma boa!</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {lista.map((e) => {
                const porAdulto = custoPorAdulto(e.total_price_cents, dados.adultosParaEstimativa);
                const ehEscolhida = e.id === escolhida;
                const possoRemover = pessoa.is_admin || e.created_by === pessoa.id;
                return (
                  <li
                    key={e.id}
                    className={`flex flex-col gap-3 rounded-lg border p-3 ${ehEscolhida ? "border-bottle bg-bottle/10" : "border-border bg-white/40"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold text-wood">{e.posicao}º</span>
                      <span className="font-medium">{e.name}</span>
                      {ehEscolhida && <Badge>Estalagem escolhida</Badge>}
                    </div>

                    {e.photos.length > 0 && (
                      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                        {e.photos.map((foto, i) => (
                          // Fotos vêm de sites externos (links colados pelos membros).
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={foto}
                            src={foto}
                            alt={`Foto ${i + 1} de ${e.name}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-28 w-40 shrink-0 rounded-md object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Preço total</dt>
                      <dd className="font-medium">{formatarCentavos(e.total_price_cents)}</dd>
                      <dt className="text-muted-foreground">Por adulto (estimado)</dt>
                      <dd className="font-medium">{porAdulto !== null ? formatarCentavos(porAdulto) : "—"}</dd>
                      {e.capacity && (
                        <>
                          <dt className="text-muted-foreground">Capacidade</dt>
                          <dd>{e.capacity} pessoas</dd>
                        </>
                      )}
                      {e.address && (
                        <>
                          <dt className="text-muted-foreground">Endereço</dt>
                          <dd>{e.address}</dd>
                        </>
                      )}
                    </dl>
                    {e.notes && <p className="text-sm whitespace-pre-line">{e.notes}</p>}
                    <p className="text-xs text-muted-foreground">Sugerida por {dados.nomeDaPessoa(e.created_by)}</p>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-bottle underline underline-offset-4"
                      >
                        Ver anúncio <ExternalLink className="size-4" aria-hidden />
                        <span className="sr-only">(abre em nova aba)</span>
                      </a>
                    )}

                    <ReacaoBotoes
                      tipo="estalagem"
                      alvoId={e.id}
                      eventoId={id}
                      placar={e.placar}
                      rotulo={e.name}
                      desativado={!!escolhida}
                    />

                    {(possoRemover || (pessoa.is_admin && !escolhida)) && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                        {pessoa.is_admin && !escolhida && (
                          <AcaoForm action={escolherEstalagem} textoBotao="Escolher esta estalagem" tamanho="sm" textoEnviando="Escolhendo…">
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
                        )}
                        {possoRemover && !ehEscolhida && (
                          <AcaoForm action={removerEstalagem} textoBotao="Remover" variante="ghost" tamanho="sm" textoEnviando="…">
                            <input type="hidden" name="id" value={e.id} />
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

      {!escolhida && (
        <Card>
          <CardHeader>
            <CardTitle>Sugerir estalagem</CardTitle>
            <CardDescription>Cole o link do anúncio e o preço total da estadia.</CardDescription>
          </CardHeader>
          <CardContent>
            <AcaoForm action={adicionarEstalagem} textoBotao="Adicionar estalagem" limparAoConcluir>
              <input type="hidden" name="evento" value={id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-nome">Nome</Label>
                <Input id="est-nome" name="nome" required maxLength={120} placeholder="Ex.: Chácara Recanto do Sol" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-link">Link do anúncio</Label>
                <Input id="est-link" name="link" type="url" inputMode="url" placeholder="https://…" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="est-preco">Preço total (R$)</Label>
                  <Input id="est-preco" name="preco" required inputMode="decimal" placeholder="3.000,00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="est-capacidade">Capacidade (pessoas)</Label>
                  <Input id="est-capacidade" name="capacidade" type="number" min={1} inputMode="numeric" />
                </div>
              </div>
              <CampoLugar id="est-endereco" rotulo="Endereço" tipo="endereco" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-fotos">Links de fotos (um por linha, opcional)</Label>
                <textarea id="est-fotos" name="fotos" rows={2} className={classeTextarea} placeholder="https://…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-notas">Observações</Label>
                <textarea id="est-notas" name="notas" rows={3} maxLength={2000} className={classeTextarea} />
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
