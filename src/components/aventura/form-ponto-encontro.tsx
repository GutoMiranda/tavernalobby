import { AcaoForm } from "@/components/acao-form";
import { CampoLugar } from "@/components/mapas/campo-lugar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { excluirPontoEncontro, salvarPontoEncontro } from "@/app/aventuras/actions";
import { nomeDoPonto, type PontoEncontro } from "@/lib/aventura-dados";

function paraCampoDataHora(iso: string | null) {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}`;
}

function horarioSP(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Formulário de um ponto de encontro: novo (sem ponto) ou edição. */
function FormPonto({ eventoId, ponto }: { eventoId: string; ponto?: PontoEncontro }) {
  const pre = ponto ? `enc-${ponto.id.slice(0, 8)}` : "enc-novo";
  return (
    <AcaoForm action={salvarPontoEncontro} textoBotao="Salvar ponto de encontro" limparAoConcluir={!ponto}>
      <input type="hidden" name="evento" value={eventoId} />
      {ponto && <input type="hidden" name="ponto" value={ponto.id} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${pre}-nome`}>Nome do lugar</Label>
        <Input
          id={`${pre}-nome`}
          name="nome"
          maxLength={120}
          defaultValue={ponto?.name ?? ""}
          placeholder="Ex.: Posto Graal da Bandeirantes"
        />
      </div>
      <CampoLugar
        id={`${pre}-lugar`}
        rotulo="Endereço"
        tipo="endereco"
        valorInicial={ponto?.address}
        latInicial={ponto?.lat ?? undefined}
        lngInicial={ponto?.lng ?? undefined}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${pre}-quando`}>Data e hora</Label>
        <Input
          id={`${pre}-quando`}
          name="quando"
          type="datetime-local"
          defaultValue={paraCampoDataHora(ponto?.meet_at ?? null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${pre}-notas`}>Observações</Label>
        <Input
          id={`${pre}-notas`}
          name="notas"
          maxLength={1000}
          defaultValue={ponto?.notes ?? ""}
          placeholder="Ex.: Ana, Bia e Caio saem daqui às 7h"
        />
      </div>
    </AcaoForm>
  );
}

/**
 * Pontos de encontro da aventura: cada grupo que viaja junto pode ter o seu. Qualquer membro cadastra;
 * quem cadastrou (ou quem tem permissão na Aventura) altera e remove.
 */
export function PontosEncontro({
  eventoId,
  pontos,
  pessoaId,
  podeEditarTodos,
  podeExcluirTodos,
}: {
  eventoId: string;
  pontos: PontoEncontro[];
  pessoaId: string;
  podeEditarTodos: boolean;
  podeExcluirTodos: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {pontos.length === 0 && <p className="text-muted-foreground">Nenhum ponto de encontro ainda.</p>}
      <ul className="flex flex-col gap-2">
        {pontos.map((p) => {
          const meu = p.created_by === pessoaId;
          return (
            <li key={p.id} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3">
              <p className="font-medium">{nomeDoPonto(p)}</p>
              {p.name && p.address && <p className="text-sm text-muted-foreground">{p.address}</p>}
              {p.meet_at && <p className="text-sm">Quando: {horarioSP(p.meet_at)}</p>}
              {p.notes && <p className="text-sm whitespace-pre-line">{p.notes}</p>}
              {p.lat == null && <p className="text-xs text-muted-foreground">Sem endereço no mapa.</p>}
              {(meu || podeEditarTodos) && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-bottle">Alterar</summary>
                  <div className="mt-2">
                    <FormPonto eventoId={eventoId} ponto={p} />
                  </div>
                </details>
              )}
              {(meu || podeExcluirTodos) && (
                <AcaoForm
                  action={excluirPontoEncontro}
                  textoBotao="Remover ponto"
                  textoEnviando="Removendo…"
                  variante="ghost"
                  tamanho="sm"
                >
                  <input type="hidden" name="evento" value={eventoId} />
                  <input type="hidden" name="ponto" value={p.id} />
                </AcaoForm>
              )}
            </li>
          );
        })}
      </ul>
      <details className="rounded-md border border-dashed border-border p-3" open={pontos.length === 0}>
        <summary className="cursor-pointer font-medium">Adicionar ponto de encontro</summary>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem vem junto pode marcar o próprio ponto (ex.: um grupo sai de São Paulo, outro de Campinas).
        </p>
        <div className="mt-3">
          <FormPonto eventoId={eventoId} />
        </div>
      </details>
    </div>
  );
}
