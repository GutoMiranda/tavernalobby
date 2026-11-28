"use client";

import { Crown, Filter, Images, LayoutGrid, List, Rows3, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
import {
  FILTROS_VAZIOS,
  type FiltrosVitrine,
  filtrosAtivos,
  type ItemVitrineBase,
  type ModoVitrine,
  montarVitrine,
  type OrdemVitrine,
} from "@/lib/vitrine-estalagens";

/** Pedaços de cada estalagem já montados no servidor (botões de curtir, ações, viagem…). */
export type ItemVitrine = ItemVitrineBase & {
  escolhida: boolean;
  foto: string | null;
  precoTexto: string;
  blocos: {
    fotos: React.ReactNode;
    detalhes: React.ReactNode;
    viagem: React.ReactNode;
    viagemCurta: React.ReactNode;
    notas: React.ReactNode;
    autor: React.ReactNode;
    anuncio: React.ReactNode;
    reacoes: React.ReactNode;
    acoes: React.ReactNode;
  };
};

const MODOS: { id: ModoVitrine; rotulo: string; icone: typeof List }[] = [
  { id: "completo", rotulo: "Completo", icone: LayoutGrid },
  { id: "resumo", rotulo: "Resumo", icone: Rows3 },
  { id: "galeria", rotulo: "Fotos", icone: Images },
  { id: "lista", rotulo: "Lista", icone: List },
];

const ORDENS: { id: OrdemVitrine; rotulo: string }[] = [
  { id: "ranking", rotulo: "Mais votadas" },
  { id: "menor_preco", rotulo: "Menor preço" },
  { id: "maior_preco", rotulo: "Maior preço" },
  { id: "mais_novas", rotulo: "Mais novas" },
  { id: "mais_perto", rotulo: "Mais perto do encontro" },
];

const CHAVE_MODO = "taverna:estalagens-modo";
const SELECT =
  "h-9 rounded-md border border-input bg-field px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold";

/**
 * Estalagens com modos de exibição (completo, resumo, fotos, lista), filtros e ordenação.
 * As mais curtidas ficam sempre no topo, destacadas, qualquer que seja o filtro.
 */
export function VitrineEstalagens({ itens, temEncontro }: { itens: ItemVitrine[]; temEncontro: boolean }) {
  const [modo, setModo] = useState<ModoVitrine>("completo");
  const [ordem, setOrdem] = useState<OrdemVitrine>("ranking");
  const [filtros, setFiltros] = useState<FiltrosVitrine>(FILTROS_VAZIOS);
  const [abrirFiltros, setAbrirFiltros] = useState(false);
  const [precoTexto, setPrecoTexto] = useState("");

  // O modo escolhido fica lembrado neste aparelho.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_MODO) as ModoVitrine | null;
      if (salvo && MODOS.some((m) => m.id === salvo)) setModo(salvo);
    } catch {
      /* sem armazenamento: fica o padrão */
    }
  }, []);
  function escolherModo(m: ModoVitrine) {
    setModo(m);
    try {
      localStorage.setItem(CHAVE_MODO, m);
    } catch {
      /* ignora */
    }
  }

  const { destaques, demais, escondidas } = useMemo(
    () => montarVitrine(itens, filtros, ordem),
    [itens, filtros, ordem],
  );
  const ativos = filtrosAtivos(filtros);
  const empate = destaques.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Modo de exibição" className="flex rounded-md border border-border p-0.5">
          {MODOS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={modo === id}
              onClick={() => escolherModo(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                modo === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icone className="size-4" aria-hidden />
              <span className="max-sm:sr-only">{rotulo}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Ordenar</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemVitrine)} className={SELECT}>
            {ORDENS.filter((o) => o.id !== "mais_perto" || temEncontro).map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant={ativos ? "default" : "outline"}
          size="sm"
          aria-expanded={abrirFiltros}
          onClick={() => setAbrirFiltros((a) => !a)}
        >
          <Filter aria-hidden /> Filtros{ativos ? ` (${ativos})` : ""}
        </Button>
      </div>

      {abrirFiltros && (
        <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-busca" className="text-xs">
              Nome
            </Label>
            <Input
              id="f-busca"
              value={filtros.busca}
              placeholder="Buscar…"
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-preco" className="text-xs">
              Preço total até (R$)
            </Label>
            <Input
              id="f-preco"
              inputMode="decimal"
              value={precoTexto}
              placeholder="sem limite"
              onChange={(e) => {
                setPrecoTexto(e.target.value);
                const c = e.target.value.trim() ? reaisParaCentavos(e.target.value) : null;
                setFiltros({ ...filtros, precoMaxCentavos: c != null && Number.isFinite(c) && c > 0 ? c : null });
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-cap" className="text-xs">
              Cabem pelo menos
            </Label>
            <Input
              id="f-cap"
              type="number"
              min={1}
              inputMode="numeric"
              value={filtros.capacidadeMin ?? ""}
              placeholder="pessoas"
              onChange={(e) =>
                setFiltros({ ...filtros, capacidadeMin: Number(e.target.value) > 0 ? Number(e.target.value) : null })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-reacao" className="text-xs">
              Meu voto
            </Label>
            <select
              id="f-reacao"
              value={filtros.reacao}
              onChange={(e) => setFiltros({ ...filtros, reacao: e.target.value as FiltrosVitrine["reacao"] })}
              className={SELECT}
            >
              <option value="todas">Todas</option>
              <option value="curti">Só as que curti</option>
              <option value="sem_voto">Ainda sem meu voto</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filtros.soComFotos}
                onChange={(e) => setFiltros({ ...filtros, soComFotos: e.target.checked })}
                className="size-4 accent-bottle"
              />
              Só com fotos
            </label>
            {ativos > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  setFiltros(FILTROS_VAZIOS);
                  setPrecoTexto("");
                }}
              >
                <X aria-hidden /> Limpar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {destaques.length > 0 && (
        <section
          aria-label={empate ? "Mais curtidas (empate)" : "Mais curtida"}
          className={cn("grid gap-3", empate && modo !== "lista" && "lg:grid-cols-2")}
        >
          {destaques.map((e) =>
            modo === "lista" ? (
              <ol key={e.id}>
                <LinhaLista e={e} destaque={empate ? "Empate · mais curtida" : "Mais curtida"} />
              </ol>
            ) : (
              <CardDestaque key={e.id} e={e} lado={!empate} selo={empate ? "Empate · mais curtida" : "Mais curtida"} />
            ),
          )}
        </section>
      )}

      {escondidas > 0 && (
        <p className="text-sm text-muted-foreground">
          {escondidas} {escondidas === 1 ? "estalagem escondida" : "estalagens escondidas"} pelos filtros.
        </p>
      )}

      {demais.length > 0 &&
        (modo === "lista" ? (
          <ol className="flex flex-col gap-2">
            {demais.map((e) => (
              <LinhaLista key={e.id} e={e} />
            ))}
          </ol>
        ) : (
          <ol
            className={cn(
              "grid gap-4",
              modo === "completo" && "sm:grid-cols-2 xl:grid-cols-3",
              modo === "resumo" && "sm:grid-cols-2 xl:grid-cols-3",
              modo === "galeria" && "grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            )}
          >
            {demais.map((e) =>
              modo === "completo" ? (
                <CardCompleto key={e.id} e={e} />
              ) : modo === "resumo" ? (
                <CardResumo key={e.id} e={e} />
              ) : (
                <CardGaleria key={e.id} e={e} />
              ),
            )}
          </ol>
        ))}
    </div>
  );
}

function Cabecalho({ e }: { e: ItemVitrine }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-lg font-semibold text-wood">{e.posicao}º</span>
      <span className="font-medium">{e.nome}</span>
      {e.escolhida && <Badge>Estalagem definida</Badge>}
    </div>
  );
}

const moldura = (e: ItemVitrine) => (e.escolhida ? "border-bottle bg-bottle/10" : "border-border bg-surface");

function CardCompleto({ e }: { e: ItemVitrine }) {
  return (
    <li className={cn("flex h-full flex-col gap-3 rounded-lg border p-3", moldura(e))}>
      <Cabecalho e={e} />
      {e.blocos.fotos}
      {e.blocos.detalhes}
      {e.blocos.viagem}
      {e.blocos.notas}
      {e.blocos.autor}
      {e.blocos.anuncio}
      {e.blocos.reacoes}
      {e.blocos.acoes}
    </li>
  );
}

function Foto({ e, className }: { e: ItemVitrine; className?: string }) {
  return e.foto ? (
    // Fotos vêm de sites externos (links colados pelos membros).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={e.foto}
      alt={`Foto de ${e.nome}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn("w-full object-cover", className)}
    />
  ) : (
    <div className={cn("grid w-full place-items-center bg-muted text-muted-foreground", className)}>
      <Images className="size-8" aria-hidden />
      <span className="sr-only">Sem foto</span>
    </div>
  );
}

function CardResumo({ e }: { e: ItemVitrine }) {
  return (
    <li className={cn("flex h-full flex-col gap-2 rounded-lg border p-3", moldura(e))}>
      <div className="flex gap-3">
        <Foto e={e} className="size-20 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Cabecalho e={e} />
          <p className="font-semibold text-wood">{e.precoTexto}</p>
          <p className="text-sm text-muted-foreground">
            {e.capacidade ? `Cabem ${e.capacidade} pessoas` : "Capacidade não informada"}
          </p>
          {e.blocos.viagemCurta}
        </div>
      </div>
      {e.blocos.anuncio}
      {e.blocos.reacoes}
      {e.blocos.acoes}
    </li>
  );
}

function CardGaleria({ e }: { e: ItemVitrine }) {
  return (
    <li className={cn("flex h-full flex-col overflow-hidden rounded-lg border", moldura(e))}>
      <div className="relative">
        <Foto e={e} className="aspect-[4/3]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8 text-[#f3e6cf]">
          <p className="font-display text-lg leading-tight font-semibold">
            {e.posicao}º · {e.nome}
          </p>
          <p className="text-sm font-medium">{e.precoTexto}</p>
        </div>
        {e.escolhida && <Badge className="absolute top-2 left-2">Estalagem definida</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {e.blocos.reacoes}
        {e.blocos.acoes}
      </div>
    </li>
  );
}

function LinhaLista({ e, destaque }: { e: ItemVitrine; destaque?: string }) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2",
        destaque ? "border-[#f2a541] bg-[#f2a541]/15 shadow-[0_0_0_1px_#f2a541]" : moldura(e),
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 flex-col">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display font-semibold text-wood">{e.posicao}º</span>
          <span className="font-medium">{e.nome}</span>
          {destaque && (
            <Badge className="gap-1 bg-[#f2a541] text-[#2a1f17]">
              <Crown className="size-3.5" aria-hidden /> {destaque}
            </Badge>
          )}
          {e.escolhida && <Badge>Definida</Badge>}
        </span>
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{e.precoTexto}</strong>
          {e.capacidade ? ` · ${e.capacidade} pessoas` : ""}
        </span>
      </div>
      {e.blocos.reacoes}
      <div className="[&>div]:mt-0 [&>div]:border-0 [&>div]:pt-0">{e.blocos.acoes}</div>
    </li>
  );
}

function CardDestaque({ e, selo, lado }: { e: ItemVitrine; selo: string; lado: boolean }) {
  return (
    <article className="relative overflow-hidden rounded-xl border-2 border-[#f2a541] bg-gradient-to-br from-[#f2a541]/25 via-surface to-surface shadow-[0_0_24px_-6px_#f2a541]">
      <div className="flex items-center gap-2 bg-[#f2a541] px-3 py-1.5 text-sm font-semibold text-[#2a1f17]">
        <Crown className="size-4" aria-hidden /> {selo} · {e.curtidas} {e.curtidas === 1 ? "curtida" : "curtidas"}
      </div>
      <div className={cn("flex flex-col", lado && "md:flex-row")}>
        {e.foto && <Foto e={e} className={cn("aspect-[16/9]", lado && "md:aspect-auto md:min-h-64 md:w-2/5")} />}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-2xl leading-tight font-semibold text-wood">{e.nome}</h3>
            {e.escolhida && <Badge>Estalagem definida</Badge>}
          </div>
          <p className="text-xl font-semibold">{e.precoTexto}</p>
          {e.blocos.detalhes}
          {e.blocos.viagem}
          {e.blocos.notas}
          {e.blocos.autor}
          {e.blocos.anuncio}
          {e.blocos.reacoes}
          {e.blocos.acoes}
        </div>
      </div>
    </article>
  );
}
