import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";

import { Dica } from "@/components/dica";
import { Ajuda } from "@/components/ajuda";
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
import { rotasEmCache } from "@/lib/rotas";
import { temposDeViagem } from "@/lib/tempos-viagem";
import { distanciasDaGalera, formatarDistancia, formatarDuracao } from "@/lib/viagem";

import { desfazerEstalagem, escolherEstalagem, removerEstalagem } from "@/app/aventuras/actions";

export async function TelaEstalagens({ id, gerenciar }: { id: string; gerenciar: boolean }) {
  const { supabase, pessoa, perm, atalhoSalao } = await contextoDaTela("estalagens", gerenciar);
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;
  const lista = ranking(dados.estalagens, dados.reacoesEstalagens, pessoa.id);
  const tempos = await temposDeViagem(supabase, dados.nucleos, dados.estalagens).catch(() => []);
  // Carro do ponto de encontro até cada estalagem (cache de 30 min por par de coordenadas).
  const encontro =
    dados.pontos[0]?.lat != null && dados.pontos[0]?.lng != null
      ? { lat: dados.pontos[0].lat, lng: dados.pontos[0].lng }
      : null;
  const doEncontro = new Map<string, { segundos: number | null; metros: number | null }>(
    encontro
      ? await Promise.all(
          dados.estalagens
            .filter((e) => e.lat != null && e.lng != null)
            .map(async (e) => {
              const [carro] = await rotasEmCache(encontro, { lat: e.lat!, lng: e.lng! }, ["DRIVE"]);
              return [e.id, { segundos: carro?.segundos ?? null, metros: carro?.metros ?? null }] as const;
            }),
        )
      : [],
  );
  const escolhida = evento.chosen_accommodation_id;

  return (
    <div className="flex flex-col gap-4">
      {atalhoSalao && <LinkSalao href={`/mestre/aventuras/${id}/estalagens`} />}
      <Card>
        <CardHeader>
          <CardTitle>
            Estalagens · hospedagens{" "}
            <Dica>
              Veja as hospedagens sugeridas, abra o anúncio e curta as que gostou. Achou uma boa? Sugira em “Sugerir
              estalagem” com o link e o preço total. Quem organiza escolhe a final.
            </Dica>
          </CardTitle>
          <Ajuda
            resumo={
              evento.accommodation_vote_deadline
                ? `Curta ou descurta. Prazo: ${formatarData(evento.accommodation_vote_deadline)}.`
                : "Curta ou descurta as sugestões."
            }
          >
            Qualquer membro sugere. Quem organiza escolhe a final. A parte de cada um aparece depois, em Custos,
            conforme a presença confirmada.
          </Ajuda>
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
                    <ViagemAteEstalagem
                      estalagem={e}
                      temEncontro={!!encontro}
                      doEncontro={doEncontro.get(e.id)}
                      galera={distanciasDaGalera(dados.usuarios, dados.nucleos, tempos, e)}
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

function ViagemAteEstalagem({
  estalagem,
  temEncontro,
  doEncontro,
  galera,
}: {
  estalagem: { lat: number | null; lng: number | null };
  temEncontro: boolean;
  doEncontro?: { segundos: number | null; metros: number | null };
  galera: ReturnType<typeof distanciasDaGalera>;
}) {
  if (estalagem.lat == null || estalagem.lng == null) return null;
  return (
    <div className="rounded-md bg-surface p-2 text-sm">
      <p>
        <span className="font-medium">Viagem de carro · do ponto de encontro:</span>{" "}
        {!temEncontro ? (
          <span className="text-muted-foreground">ponto de encontro ainda não definido</span>
        ) : doEncontro?.segundos != null ? (
          <strong>
            {formatarDuracao(doEncontro.segundos)}
            {doEncontro.metros != null && ` (${formatarDistancia(doEncontro.metros)})`}
          </strong>
        ) : (
          <span className="text-muted-foreground">sem rota de carro</span>
        )}
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer text-bottle">Distância de onde a galera vem</summary>
        <ul className="mt-1 flex flex-col gap-0.5">
          {galera.map((g) => (
            <li key={g.pessoaId}>
              {g.nome}:{" "}
              {g.metros == null ? (
                <span className="text-muted-foreground">sem cidade cadastrada</span>
              ) : (
                <>
                  {formatarDistancia(g.metros)}
                  {g.emLinhaReta && <span className="text-muted-foreground"> em linha reta</span>}
                </>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
