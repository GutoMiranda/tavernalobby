import { ArrowRight, Flag, Home, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Dica } from "@/components/dica";
import { PontosEncontro } from "@/components/aventura/form-ponto-encontro";
import { RotaViewer } from "@/components/mapas/rota-viewer";
import { SeletorRota } from "@/components/mapas/seletor-rota";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { ranking } from "@/lib/aventura";
import { carregarAventura, nomeDoPonto } from "@/lib/aventura-dados";
import { type RotaResumo, rotasEmCache } from "@/lib/rotas";
import { formatarDuracao } from "@/lib/viagem";
import { maisCurtidas, rotuloEstalagemNaRota } from "@/lib/vitrine-estalagens";

export const metadata: Metadata = { title: "Geral" };

/** nome: usado no compartilhar; rotulo: texto na lista de escolha (com marcações). */
type Local = { chave: string; nome: string; rotulo?: string; detalhe?: string; lat: number; lng: number };
const nomeDoPontoLocal = (l: Local) => l.nome.replace(/^Ponto de encontro: /, "");

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
  const encontros: Local[] = dados.pontos
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      chave: `p:${p.id}`,
      nome: `Ponto de encontro: ${nomeDoPonto(p)}`,
      detalhe: p.address ?? undefined,
      lat: p.lat!,
      lng: p.lng!,
    }));
  const encontro = encontros[0];
  // Na ordem do ranking, com a definida primeiro e as mais votadas marcadas.
  const ranqueadas = ranking(dados.estalagens, dados.reacoesEstalagens);
  const topo = maisCurtidas(ranqueadas.map((e) => ({ id: e.id, curtidas: e.placar.curtidas })));
  const estalagens: Local[] = ranqueadas
    .filter((e) => e.lat != null && e.lng != null)
    .sort((a, b) => Number(b.id === evento.chosen_accommodation_id) - Number(a.id === evento.chosen_accommodation_id))
    .map((e) => {
      const definida = e.id === evento.chosen_accommodation_id;
      return {
        chave: `e:${e.id}`,
        nome: `${definida ? "Estalagem definida: " : "Estalagem: "}${e.name}`,
        rotulo: rotuloEstalagemNaRota({
          nome: e.name,
          definida,
          maisCurtida: topo.has(e.id),
          empate: topo.size > 1,
          curtidas: e.placar.curtidas,
          posicao: e.posicao,
        }),
        detalhe: e.address ?? undefined,
        lat: e.lat!,
        lng: e.lng!,
      };
    });
  const escolhida = estalagens.find((e) => e.chave === `e:${evento.chosen_accommodation_id}`);
  const todos = [...origens, ...encontros, ...estalagens];
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

  // Roteiro do meu núcleo: origem → primeiro ponto de encontro → estalagem (de carro).
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
            <Flag className="size-5 text-bottle" aria-hidden /> Pontos de encontro
            <Dica>
              Vai sair junto com outras famílias? Cadastre o lugar e o horário em que vocês se encontram. Cada grupo
              pode ter o seu ponto, e ele aparece no mapa como opção de saída.
            </Dica>
          </CardTitle>
          <CardDescription>Onde a party se reúne antes de seguir para a estalagem. Pode haver vários.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <PontosEncontro
            eventoId={id}
            pontos={dados.pontos}
            pessoaId={pessoa.id}
            podeEditarTodos={permissoes.aventura.editar}
            podeExcluirTodos={permissoes.aventura.excluir}
          />

          {roteiro && (
            <div className="rounded-md bg-surface p-3 text-sm">
              <p className="mb-1 font-medium">Seu roteiro de carro (via {nomeDoPontoLocal(encontro!)})</p>
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
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-bottle" aria-hidden /> Rotas
            <Dica>
              Escolha a saída e o destino e toque em “Ver rota”. Depois escolha o meio de transporte. Em ônibus/metrô dá
              para escolher o horário de saída. “Compartilhar rota completa” manda tudo pelo WhatsApp.
            </Dica>
          </CardTitle>
          <CardDescription>
            Escolha de onde e para onde. O tempo de carro e moto considera o trânsito de agora.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {todos.length < 2 ? (
            <p className="text-muted-foreground">
              Para ver rotas, informe o ponto de saída do seu núcleo (em Minha família) e o endereço do ponto de
              encontro ou de uma estalagem.
            </p>
          ) : (
            <>
              <SeletorRota opcoes={todos} de={de?.chave} para={para?.chave}>
                {podeRotear ? (
                  <>
                    <RotaViewer key={`${de.chave}-${para.chave}`} origem={de} destino={para} resumo={resumo} />
                  </>
                ) : (
                  <p className="text-muted-foreground">Escolha uma origem e um destino diferentes.</p>
                )}
              </SeletorRota>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
