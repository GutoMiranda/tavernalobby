import { CheckCircle2, CircleHelp, MessageCircle, XCircle } from "lucide-react";

import { Ajuda } from "@/components/ajuda";
import { AcaoForm } from "@/components/acao-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LinkSalao } from "@/components/mestre/link-salao";
import { carregarAventura } from "@/lib/aventura-dados";
import { linkWhatsApp, mensagemCobrancaPresenca } from "@/lib/cobranca";
import { carregarCustos, type PessoaGrupo, type Presenca } from "@/lib/custos-dados";
import { contextoDaTela } from "@/lib/telas";
import { cn } from "@/lib/utils";

import { salvarPresenca } from "@/app/aventuras/custos-actions";

const SELECT = "h-10 rounded-md border border-input bg-field px-3 text-base md:text-sm";

export async function TelaPresenca({ id, gerenciar }: { id: string; gerenciar: boolean }) {
  const { supabase, pessoa, perm, atalhoSalao } = await contextoDaTela("presenca", gerenciar);
  const dados = await carregarAventura(supabase, id);
  const { pessoas, presencas, totalDias, periodo } = await carregarCustos(supabase, dados);

  const nucleos = dados.nucleos
    .map((n) => ({ ...n, membros: pessoas.filter((p) => p.household_id === n.id) }))
    .filter((n) => n.membros.length > 0)
    .sort((a, b) =>
      a.id === pessoa.household_id ? -1 : b.id === pessoa.household_id ? 1 : a.name.localeCompare(b.name),
    );

  const st = (p: PessoaGrupo) => presencas.get(p.id)?.status ?? "pendente";
  const vao = pessoas.filter((p) => st(p) === "vai");
  const adultosVao = vao.filter((p) => !p.is_child).length;
  const criancasVao = vao.length - adultosVao;
  const naoVao = pessoas.filter((p) => st(p) === "nao_vai").length;
  const pendentes = pessoas.length - vao.length - naoVao;
  const cobranca =
    pendentes > 0
      ? linkWhatsApp(
          mensagemCobrancaPresenca(
            dados.evento.name,
            nucleos.map((n) => ({
              nucleo: n.name,
              pessoas: n.membros.filter((m) => st(m) === "pendente").map((m) => m.name),
            })),
            `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/aventuras/${id}/presenca`,
          ),
        )
      : null;
  const alcool = vao.filter((p) => !p.is_child && presencas.get(p.id)?.alcohol_opt_in).length;

  return (
    <div className="grade-taverna">
      {atalhoSalao && (
        <div className="lg:col-span-3">
          <LinkSalao href={`/mestre/aventuras/${id}/presenca`} />
        </div>
      )}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Presença · quem vai</CardTitle>
          <Ajuda
            resumo={
              totalDias
                ? `O período tem ${totalDias} ${totalDias === 1 ? "dia" : "dias"}${
                    periodo?.fonte === "mais_votada"
                      ? " (prévia pela data mais votada; vale a data que for fechada)"
                      : ""
                  }.`
                : "As datas ainda não foram fechadas; os dias ficam para depois."
            }
          >
            Um adulto de cada núcleo confirma por todos da família: se vai, quantos dias fica e se entra no rateio das
            bebidas alcoólicas.
          </Ajuda>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumo da presença">
            <Numero rotulo="Adultos confirmados" valor={adultosVao} />
            <Numero rotulo="Crianças confirmadas" valor={criancasVao} />
            <Numero rotulo="Não vão" valor={naoVao} />
            <Numero rotulo="Sem resposta" valor={pendentes} />
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            {alcool} {alcool === 1 ? "adulto entrou" : "adultos entraram"} no rateio de bebidas alcoólicas.
          </p>
          {cobranca && (
            <a
              href={cobranca}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "mt-3 h-auto min-h-10 whitespace-normal")}
            >
              <MessageCircle className="size-4" aria-hidden /> Cobrar no WhatsApp quem não respondeu
            </a>
          )}
        </CardContent>
      </Card>

      {nucleos.map((n) => {
        const meu = n.id === pessoa.household_id;
        const editavel = meu || perm.editar;
        return (
          <Card key={n.id} className={meu ? "border-gold/60 lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>{meu ? `Seu núcleo · ${n.name}` : n.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {editavel ? (
                <details open={meu}>
                  <summary className={meu ? "sr-only" : "cursor-pointer text-sm font-medium text-bottle"}>
                    {meu ? "Confirmar presença" : "Editar a presença deste núcleo"}
                  </summary>
                  <AcaoForm action={salvarPresenca} textoBotao="Salvar presença" className="mt-2">
                    <input type="hidden" name="evento" value={id} />
                    <ul className="flex flex-col gap-4">
                      {n.membros.map((m) => (
                        <LinhaPessoa key={m.id} m={m} pr={presencas.get(m.id)} totalDias={totalDias} />
                      ))}
                    </ul>
                  </AcaoForm>
                </details>
              ) : null}
              {!meu && <ListaStatus membros={n.membros} presencas={presencas} totalDias={totalDias} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <li className="rounded-md border border-border bg-surface p-3">
      <p className="text-2xl font-semibold text-wood">{valor}</p>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
    </li>
  );
}

function LinhaPessoa({ m, pr, totalDias }: { m: PessoaGrupo; pr: Presenca | undefined; totalDias: number | null }) {
  const status = pr?.status ?? "pendente";
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
      <input type="hidden" name="pessoa" value={m.id} />
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {m.name}
        {m.is_child && <Badge variant="outline">Criança</Badge>}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`status_${m.id}`}>Vai?</Label>
          <select id={`status_${m.id}`} name={`status_${m.id}`} defaultValue={status} className={SELECT}>
            <option value="pendente">Ainda não sei</option>
            <option value="vai">Vai</option>
            <option value="nao_vai">Não vai</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`dias_${m.id}`}>Quantos dias fica</Label>
          {totalDias ? (
            <select
              id={`dias_${m.id}`}
              name={`dias_${m.id}`}
              defaultValue={pr?.days ? String(pr.days) : "todo"}
              className={SELECT}
            >
              <option value="todo">Período todo ({totalDias} dias)</option>
              {Array.from({ length: totalDias - 1 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "dia" : "dias"}
                </option>
              ))}
            </select>
          ) : (
            <select id={`dias_${m.id}`} name={`dias_${m.id}`} defaultValue="todo" className={SELECT} disabled>
              <option value="todo">Período todo (datas a definir)</option>
            </select>
          )}
        </div>
        {!m.is_child && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name={`alcool_${m.id}`}
              defaultChecked={pr?.alcohol_opt_in ?? false}
              className="size-5 accent-bottle"
            />
            Entra no rateio de bebidas alcoólicas
          </label>
        )}
      </div>
    </li>
  );
}

function ListaStatus({
  membros,
  presencas,
  totalDias,
}: {
  membros: PessoaGrupo[];
  presencas: Map<string, Presenca>;
  totalDias: number | null;
}) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {membros.map((m) => {
        const pr = presencas.get(m.id);
        const status = pr?.status ?? "pendente";
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-1.5">
            {status === "vai" ? (
              <CheckCircle2 className="size-4 text-bottle" aria-hidden />
            ) : status === "nao_vai" ? (
              <XCircle className="size-4 text-alert" aria-hidden />
            ) : (
              <CircleHelp className="size-4 text-muted-foreground" aria-hidden />
            )}
            <span className="font-medium">{m.name}</span>
            {m.is_child && <span className="text-muted-foreground">(criança)</span>}
            <span className="text-muted-foreground">
              ·{" "}
              {status === "vai"
                ? `vai${pr?.days ? `, ${pr.days} ${pr.days === 1 ? "dia" : "dias"}` : totalDias ? ", período todo" : ""}${pr?.alcohol_opt_in ? ", álcool" : ""}`
                : status === "nao_vai"
                  ? "não vai"
                  : "sem resposta"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
