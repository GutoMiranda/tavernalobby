import { ArrowRight, Flag, Home, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { RotaViewer } from "@/components/mapas/rota-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LinkSalao } from "@/components/mestre/link-salao";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { type ModoRota, type RotaResumo, rotasEmCache } from "@/lib/rotas";
import { formatarDistancia, formatarDuracao } from "@/lib/viagem";

export const metadata: Metadata = { title: "Geral" };

type Local = { chave: string; nome: string; detalhe?: string; lat: number; lng: number };

const NOME_MODO: Record<ModoRota, string> = {
  DRIVE: "Carro",
  TWO_WHEELER: "Moto",
  TRANSIT: "Ônibus / metrô",
  WALK: "A pé",
};

function horarioSP(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function GeralPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; para?: string }>;
}) {
  const { id } = await params;
  const filtros = await searchParams;
  const { supabase, pessoa } = await exigirMembro();
  const permissoes = await getPermissoes();
  const dados = await carregarAventura(supabase, id);
  const { evento } = dados;

  const origens: Local[] = dados.nucleos
    .filter((n) => n.origin_lat != null && n.origin_lng != null)
    .map((n) => ({
      chave: `n:${n.id}`,
      nome: n.id === pessoa.household_id ? `${n.name} (você)` : n.name,
      detalhe: n.origin_text ?? undefined,
      lat: n.origin_lat!,
      lng: n.origin_lng!,
    }));
  const encontro: Local | null =
    evento.meeting_lat != null && evento.meeting_lng != null
      ? {
          chave: "encontro",
          nome: `Ponto de encontro${evento.meeting_name ? `: ${evento.meeting_name}` : ""}`,
          detalhe: evento.meeting_address ?? undefined,
          lat: evento.meeting_lat,
          lng: evento.meeting_lng,
        }
      : null;
  const estalagens: Local[] = dados.estalagens
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => ({
      chave: `e:${e.id}`,
      nome: `${e.id === evento.chosen_accommodation_id ? "Estalagem escolhida: " : "Estalagem: "}${e.name}`,
      detalhe: e.address ?? undefined,
      lat: e.lat!,
      lng: e.lng!,
    }));
  const escolhida = estalagens.find((e) => e.chave === `e:${evento.chosen_accommodation_id}`);
  const todos = [...origens, ...(encontro ? [encontro] : []), ...estalagens];
  const minhaOrigem = origens.find((o) => o.chave === `n:${pessoa.household_id}`);

  const de = todos.find((l) => l.chave === filtros.de) ?? minhaOrigem ?? origens[0];
  const para = todos.find((l) => l.chave === filtros.para) ?? encontro ?? escolhida ?? estalagens[0];
  const podeRotear = de && para && de.chave !== para.chave;

  const resumo: RotaResumo[] = podeRotear
    ? await rotasEmCache({ lat: de.lat, lng: de.lng }, { lat: para.lat, lng: para.lng }, [
        "DRIVE",
        "TWO_WHEELER",
        "TRANSIT",
        "WALK",
      ]).catch(() => [])
    : [];

  // Roteiro do meu núcleo: origem → ponto de encontro → estalagem (de carro).
  const roteiro =
    minhaOrigem && encontro && escolhida
      ? await Promise.all([
          rotasEmCache(minhaOrigem, encontro, ["DRIVE"]).catch(() => []),
          rotasEmCache(encontro, escolhida, ["DRIVE"]).catch(() => []),
        ])
      : null;

  return (
    <div className="grade-taverna">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="size-5 text-bottle" aria-hidden /> Ponto de encontro
          </CardTitle>
          <CardDescription>Onde a party se reúne antes de seguir para a estalagem.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {evento.meeting_address || evento.meeting_name ? (
            <div className="flex flex-col gap-1">
              {evento.meeting_name && <p className="font-medium">{evento.meeting_name}</p>}
              {evento.meeting_address && <p className="text-sm text-muted-foreground">{evento.meeting_address}</p>}
              {evento.meeting_at && <p className="text-sm">Quando: {horarioSP(evento.meeting_at)}</p>}
              {evento.meeting_notes && <p className="text-sm whitespace-pre-line">{evento.meeting_notes}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground">Ainda não definido. Quem organiza vai marcar.</p>
          )}

          {roteiro && (
            <div className="rounded-md bg-surface p-3 text-sm">
              <p className="mb-1 font-medium">Seu roteiro de carro</p>
              <ol className="flex flex-col gap-1">
                <li className="flex items-center gap-1.5">
                  <Home className="size-4" aria-hidden /> Saída → encontro:{" "}
                  <strong>{roteiro[0][0]?.segundos != null ? formatarDuracao(roteiro[0][0].segundos) : "—"}</strong>
                </li>
                <li className="flex items-center gap-1.5">
                  <ArrowRight className="size-4" aria-hidden /> Encontro → estalagem:{" "}
                  <strong>{roteiro[1][0]?.segundos != null ? formatarDuracao(roteiro[1][0].segundos) : "—"}</strong>
                </li>
              </ol>
            </div>
          )}

          {permissoes.aventura.ver && (
            <LinkSalao href={`/mestre/aventuras/${id}/aventura`} texto="Definir no Salão do Mestre" />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-bottle" aria-hidden /> Rotas
          </CardTitle>
          <CardDescription>
            Escolha de onde e para onde. O tempo de carro e moto considera o trânsito de agora.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {todos.length < 2 ? (
            <p className="text-muted-foreground">
              Para ver rotas, informe a cidade de saída do seu núcleo (em Minha família) e o endereço do ponto de
              encontro ou de uma estalagem.
            </p>
          ) : (
            <>
              <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="de">De</Label>
                  <select
                    id="de"
                    name="de"
                    defaultValue={de?.chave}
                    className="h-10 rounded-md border border-input bg-field px-3 text-base md:text-sm"
                  >
                    {todos.map((l) => (
                      <option key={l.chave} value={l.chave}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="para">Para</Label>
                  <select
                    id="para"
                    name="para"
                    defaultValue={para?.chave}
                    className="h-10 rounded-md border border-input bg-field px-3 text-base md:text-sm"
                  >
                    {todos.map((l) => (
                      <option key={l.chave} value={l.chave}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit">Ver rota</Button>
              </form>

              {podeRotear ? (
                <>
                  {resumo.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tempo por modo">
                      {resumo.map((r) => (
                        <li key={r.modo} className="rounded-md border border-border bg-surface p-3">
                          <p className="text-sm text-muted-foreground">{NOME_MODO[r.modo]}</p>
                          {r.segundos != null ? (
                            <>
                              <p className="text-lg font-semibold">{formatarDuracao(r.segundos)}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.metros != null && formatarDistancia(r.metros)}
                                {r.segundosSemTransito != null &&
                                  r.segundos - r.segundosSemTransito > 300 &&
                                  ` · +${formatarDuracao(r.segundos - r.segundosSemTransito)} de trânsito`}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm">Sem rota disponível</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {resumo.find((r) => r.erro) && (
                    <p className="text-sm break-words text-alert">
                      O Google recusou parte do cálculo: {resumo.find((r) => r.erro)?.erro}
                    </p>
                  )}
                  <RotaViewer key={`${de.chave}-${para.chave}`} origem={de} destino={para} />
                </>
              ) : (
                <p className="text-muted-foreground">Escolha uma origem e um destino diferentes.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
