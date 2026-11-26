import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";

import { AcaoForm } from "@/components/acao-form";
import { FormEstalagem } from "@/components/aventura/form-estalagem";
import { ReacaoBotoes } from "@/components/aventura/reacao-botoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkSalao } from "@/components/mestre/link-salao";
import { ranking } from "@/lib/aventura";
import { carregarAventura } from "@/lib/aventura-dados";
import { formatarCentavos, formatarData } from "@/lib/format";
import { contextoDaTela } from "@/lib/telas";
import { temposDeViagem } from "@/lib/tempos-viagem";
import { formatarDistancia, formatarDuracao, indiceJustica } from "@/lib/viagem";

import { desfazerEstalagem, escolherEstalagem, removerEstalagem } from "@/app/aventuras/actions";

export async function TelaEstalagens({ id, gerenciar }: { id: string; gerenciar: boolean }) {
  const { supabase, pessoa, perm, atalhoSalao } = await contextoDaTela("estalagens", gerenciar);
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;
  const lista = ranking(dados.estalagens, dados.reacoesEstalagens, pessoa.id);
  const tempos = await temposDeViagem(supabase, dados.nucleos, dados.estalagens).catch(() => []);
  const nomeNucleo = new Map(dados.nucleos.map((n) => [n.id, n.name]));
  const escolhida = evento.chosen_accommodation_id;

  return (
    <div className="flex flex-col gap-4">
      {atalhoSalao && <LinkSalao href={`/mestre/aventuras/${id}/estalagens`} />}
      <Card>
        <CardHeader>
          <CardTitle>Estalagens · hospedagens</CardTitle>
          <CardDescription>
            Qualquer membro sugere. Curta ou descurta; quem organiza escolhe a final. A parte de cada um aparece depois,
            em Custos, conforme a presença confirmada.
            {evento.accommodation_vote_deadline && ` Prazo: ${formatarData(evento.accommodation_vote_deadline)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma estalagem sugerida ainda. Seja o primeiro a achar uma boa!</p>
          ) : (
            <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((e) => {
                const ehEscolhida = e.id === escolhida;
                const minha = e.created_by === pessoa.id;
                const possoEditar = minha || perm.editar;
                const possoRemover = minha || perm.excluir;
                return (
                  <li
                    key={e.id}
                    className={`flex h-full flex-col gap-3 rounded-lg border p-3 ${ehEscolhida ? "border-bottle bg-bottle/10" : "border-border bg-surface"}`}
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
                            className="h-36 w-56 shrink-0 rounded-md object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Preço total</dt>
                      <dd className="font-medium">{formatarCentavos(e.total_price_cents)}</dd>
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
                    <TemposDaEstalagem
                      estalagemId={e.id}
                      tempos={tempos}
                      nomeNucleo={nomeNucleo}
                      meuNucleo={pessoa.household_id}
                    />
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

                    {(possoEditar || possoRemover || perm.editar) && (
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-2">
                        {possoEditar && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/aventuras/${id}/estalagens/${e.id}`}>
                              <Pencil aria-hidden /> Editar
                            </Link>
                          </Button>
                        )}
                        {perm.editar && ehEscolhida && (
                          <AcaoForm
                            action={desfazerEstalagem}
                            textoBotao="Desfazer escolha"
                            variante="outline"
                            tamanho="sm"
                            textoEnviando="Desfazendo…"
                          >
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
                        )}
                        {perm.editar && !ehEscolhida && (
                          <AcaoForm
                            action={escolherEstalagem}
                            textoBotao={escolhida ? "Trocar para esta" : "Escolher esta estalagem"}
                            tamanho="sm"
                            textoEnviando="Escolhendo…"
                          >
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="evento" value={id} />
                          </AcaoForm>
                        )}
                        {possoRemover && (
                          <AcaoForm
                            action={removerEstalagem}
                            textoBotao="Remover"
                            variante="ghost"
                            tamanho="sm"
                            textoEnviando="…"
                          >
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

      {!gerenciar && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Sugerir estalagem</CardTitle>
            <CardDescription>
              Cole o link do anúncio e toque em “Preencher pelo link”. Confira e ajuste antes de salvar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormEstalagem eventoId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TemposDaEstalagem({
  estalagemId,
  tempos,
  nomeNucleo,
  meuNucleo,
}: {
  estalagemId: string;
  tempos: Awaited<ReturnType<typeof temposDeViagem>>;
  nomeNucleo: Map<string, string>;
  meuNucleo: string;
}) {
  const daqui = tempos
    .filter((t) => t.accommodation_id === estalagemId)
    .sort((a, b) => (a.duration_seconds ?? Infinity) - (b.duration_seconds ?? Infinity));
  const indice = indiceJustica(tempos, estalagemId);
  if (daqui.length === 0) return null;
  const meu = daqui.find((t) => t.household_id === meuNucleo);

  return (
    <div className="rounded-md bg-surface p-2 text-sm">
      <p>
        <span className="font-medium">Viagem de carro</span>
        {meu?.duration_seconds != null && (
          <>
            {" "}
            · do seu núcleo: <strong>{formatarDuracao(meu.duration_seconds)}</strong>
          </>
        )}
      </p>
      {indice && (
        <p className="text-muted-foreground">
          Índice de justiça · média do grupo {formatarDuracao(indice.mediaSegundos)}, mais longe{" "}
          {formatarDuracao(indice.maximoSegundos)}
        </p>
      )}
      <details className="mt-1">
        <summary className="cursor-pointer text-bottle">Tempo de cada núcleo</summary>
        <ul className="mt-1 flex flex-col gap-0.5">
          {daqui.map((t) => (
            <li key={t.household_id}>
              {nomeNucleo.get(t.household_id) ?? "Núcleo"}:{" "}
              {t.duration_seconds != null
                ? `${formatarDuracao(t.duration_seconds)}${t.distance_meters != null ? ` (${formatarDistancia(t.distance_meters)})` : ""}`
                : "sem rota de carro"}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
