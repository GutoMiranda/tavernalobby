"use client";

import { Pencil, Trash2, Wine } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { editarItemArmazem, removerItensArmazem, usarSugestao } from "@/app/aventuras/armazem-actions";
import { AcaoForm } from "@/components/acao-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstadoAcao } from "@/lib/erros";
import { CATEGORIAS_ARMAZEM, UNIDADES_ARMAZEM } from "@/lib/finance/armazem";
import { formatarCentavos } from "@/lib/format";

import { CamposItem, SELECT, type ValoresItem } from "./campos-item";

export type LinhaArmazem = ValoresItem & {
  id: string;
  cost_cents: number;
  sugestao: number | null;
  consumo: number | null;
  consumoInformado: boolean;
  pessoasDia: number;
  podeExcluir: boolean;
};

const qtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function TabelaArmazem({ linhas, eventoId }: { linhas: LinhaArmazem[]; eventoId: string }) {
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [excluirUm, setExcluirUm] = useState<string | null>(null);
  const [estadoExcluir, excluir, excluindo] = useActionState(async (s: EstadoAcao, d: FormData) => {
    const r = await removerItensArmazem(s, d);
    if (r.ok) setSelecionados(new Set());
    setConfirmar(false);
    setExcluirUm(null);
    return r;
  }, {});

  const visiveis = useMemo(() => {
    const b = busca.trim().toLocaleLowerCase("pt-BR");
    return linhas.filter(
      (l) =>
        (!categoria || (categoria === "-" ? !l.category : l.category === categoria)) &&
        (!unidade || l.unit === unidade) &&
        (!b || l.name.toLocaleLowerCase("pt-BR").includes(b)),
    );
  }, [linhas, categoria, unidade, busca]);

  const idsVisiveis = visiveis.map((l) => l.id);
  const selecionaveis = visiveis.filter((l) => l.podeExcluir).map((l) => l.id);
  const todosMarcados = selecionaveis.length > 0 && selecionaveis.every((id) => selecionados.has(id));
  const marcados = [...selecionados].filter((id) => idsVisiveis.includes(id));
  const totalVisivel = visiveis.reduce((s, l) => s + l.cost_cents, 0);
  const unidadesUsadas = UNIDADES_ARMAZEM.filter((u) => linhas.some((l) => l.unit === u.id));

  const alternar = (id: string) =>
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3" role="search" aria-label="Filtros do armazém">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-busca">Buscar</Label>
          <Input id="f-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do item" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-cat">Categoria</Label>
          <select id="f-cat" className={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS_ARMAZEM.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="-">Sem categoria</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-un">Unidade</Label>
          <select id="f-un" className={SELECT} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            <option value="">Todas</option>
            {unidadesUsadas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form action={excluir} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="evento" value={eventoId} />
        {marcados.map((id) => (
          <input key={id} type="hidden" name="id" value={id} />
        ))}
        {!confirmar ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={marcados.length === 0}
            onClick={() => setConfirmar(true)}
          >
            <Trash2 className="size-4" aria-hidden /> Excluir selecionados ({marcados.length})
          </Button>
        ) : (
          <>
            <Button type="submit" variant="destructive" size="sm" disabled={excluindo}>
              {excluindo ? "Excluindo…" : `Confirmar exclusão de ${marcados.length}`}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
          </>
        )}
        <p role="status" aria-live="polite" className="text-sm">
          {estadoExcluir.ok && <span className="text-bottle">{estadoExcluir.ok}</span>}
          {estadoExcluir.erro && <span className="font-medium text-alert">{estadoExcluir.erro}</span>}
        </p>
      </form>

      <div className="relative -mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">Itens do armazém</caption>
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th scope="col" className="w-10 p-2">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os itens visíveis"
                  className="size-5 accent-bottle"
                  checked={todosMarcados}
                  disabled={selecionaveis.length === 0}
                  onChange={() =>
                    setSelecionados((s) => {
                      const n = new Set(s);
                      for (const id of selecionaveis) {
                        if (todosMarcados) n.delete(id);
                        else n.add(id);
                      }
                      return n;
                    })
                  }
                />
              </th>
              <th scope="col" className="p-2">
                Item
              </th>
              <th scope="col" className="p-2">
                Categoria
              </th>
              <th scope="col" className="p-2 text-right">
                Preço/un.
              </th>
              <th scope="col" className="p-2 text-right">
                Quantidade
              </th>
              <th scope="col" className="p-2 text-right">
                Custo
              </th>
              <th scope="col" className="p-2">
                Sugestão
              </th>
              <th scope="col" className="p-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                  Nenhum item com esses filtros.
                </td>
              </tr>
            )}
            {visiveis.map((l) =>
              editando === l.id ? (
                <tr key={l.id} className="border-b border-border bg-gold/5">
                  <td colSpan={8} className="p-3">
                    <AcaoForm action={editarItemArmazem} textoBotao="Salvar item" tamanho="sm">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="evento" value={eventoId} />
                      <CamposItem prefixo={`ed-${l.id}`} item={l} />
                    </AcaoForm>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setEditando(null)}>
                      Fechar edição
                    </Button>
                  </td>
                </tr>
              ) : (
                <tr key={l.id} className="border-b border-border align-top">
                  <td className="p-2">
                    {l.podeExcluir && (
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${l.name}`}
                        className="size-5 accent-bottle"
                        checked={selecionados.has(l.id)}
                        onChange={() => alternar(l.id)}
                      />
                    )}
                  </td>
                  <td className="p-2 font-medium">
                    {l.name}
                    {l.is_alcoholic && (
                      <span
                        className="ml-1 inline-flex items-center gap-0.5 text-xs text-wood"
                        title="Bebida alcoólica"
                      >
                        <Wine className="size-3.5" aria-hidden /> alcoólico
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">{l.category ?? "—"}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    {l.unit_price_cents != null ? `${formatarCentavos(l.unit_price_cents)}/${l.unit}` : "—"}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    {l.quantity != null ? `${qtd.format(l.quantity)} ${l.unit}` : "—"}
                  </td>
                  <td className="p-2 text-right font-semibold whitespace-nowrap">{formatarCentavos(l.cost_cents)}</td>
                  <td className="p-2">
                    {l.sugestao != null ? (
                      <div className="flex flex-col gap-1">
                        <span
                          className="whitespace-nowrap"
                          title={`${qtd.format(l.consumo!)} ${l.unit} por pessoa por dia × ${l.pessoasDia} pessoas-dia`}
                        >
                          ≈ {qtd.format(l.sugestao)} {l.unit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {qtd.format(l.consumo!)}/pessoa/dia{l.consumoInformado ? "" : " (referência)"}
                        </span>
                        {l.sugestao !== l.quantity && (
                          <AcaoForm
                            action={usarSugestao}
                            textoBotao="Usar"
                            tamanho="sm"
                            variante="outline"
                            textoEnviando="…"
                          >
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="evento" value={eventoId} />
                            <input type="hidden" name="quantidade" value={String(l.sugestao)} />
                          </AcaoForm>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Informe o consumo por pessoa ao editar</span>
                    )}
                  </td>
                  <td className="p-2">
                    {excluirUm === l.id ? (
                      <form action={excluir} className="flex flex-col gap-1">
                        <input type="hidden" name="evento" value={eventoId} />
                        <input type="hidden" name="id" value={l.id} />
                        <Button type="submit" variant="destructive" size="sm" disabled={excluindo}>
                          {excluindo ? "…" : "Excluir"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setExcluirUm(null)}>
                          Cancelar
                        </Button>
                      </form>
                    ) : (
                      <div className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${l.name}`}
                          title="Editar"
                          onClick={() => setEditando(l.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        {l.podeExcluir && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Excluir ${l.name}`}
                            title="Excluir"
                            className="text-alert"
                            onClick={() => setExcluirUm(l.id)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td colSpan={5} className="p-2 text-right">
                Total {visiveis.length === linhas.length ? "" : "filtrado "}({visiveis.length}{" "}
                {visiveis.length === 1 ? "item" : "itens"})
              </td>
              <td className="p-2 text-right whitespace-nowrap">{formatarCentavos(totalVisivel)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Exclua um item pela lixeira da linha ou vários marcando as caixas. Podem excluir: quem criou o item, o admin ou
        o Guardião do Armazém (tag Despensa).
      </p>
    </div>
  );
}
