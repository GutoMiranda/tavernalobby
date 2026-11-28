/**
 * Vitrine das estalagens: destaque das mais curtidas, filtros e ordenação. Funções puras (sem rede),
 * usadas no navegador para filtrar sem recarregar a página.
 */

export type ModoVitrine = "completo" | "resumo" | "galeria" | "lista";
export type OrdemVitrine = "ranking" | "menor_preco" | "maior_preco" | "mais_novas" | "mais_perto";

export type ItemVitrineBase = {
  id: string;
  nome: string;
  precoCentavos: number;
  capacidade: number | null;
  curtidas: number;
  descurtidas: number;
  minha: 1 | -1 | null;
  /** Posição no ranking (saldo de curtidas). */
  posicao: number;
  temFotos: boolean;
  criadaEm: string;
  /** Segundos de carro do ponto de encontro, quando calculado. */
  segundosDoEncontro: number | null;
};

export type FiltrosVitrine = {
  busca: string;
  precoMaxCentavos: number | null;
  capacidadeMin: number | null;
  reacao: "todas" | "curti" | "sem_voto";
  soComFotos: boolean;
};

export const FILTROS_VAZIOS: FiltrosVitrine = {
  busca: "",
  precoMaxCentavos: null,
  capacidadeMin: null,
  reacao: "todas",
  soComFotos: false,
};

/** Ids das mais curtidas: o maior número de curtidas (ao menos 1); empates entram todos. */
export function maisCurtidas(itens: Pick<ItemVitrineBase, "id" | "curtidas">[]): Set<string> {
  const maximo = Math.max(0, ...itens.map((i) => i.curtidas));
  if (maximo === 0) return new Set();
  return new Set(itens.filter((i) => i.curtidas === maximo).map((i) => i.id));
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function passaNoFiltro(item: ItemVitrineBase, f: FiltrosVitrine): boolean {
  if (f.busca.trim() && !semAcento(item.nome).includes(semAcento(f.busca.trim()))) return false;
  if (f.precoMaxCentavos != null && item.precoCentavos > f.precoMaxCentavos) return false;
  if (f.capacidadeMin != null && (item.capacidade ?? 0) < f.capacidadeMin) return false;
  if (f.reacao === "curti" && item.minha !== 1) return false;
  if (f.reacao === "sem_voto" && item.minha !== null) return false;
  if (f.soComFotos && !item.temFotos) return false;
  return true;
}

export function filtrosAtivos(f: FiltrosVitrine): number {
  return [
    f.busca.trim() !== "",
    f.precoMaxCentavos != null,
    f.capacidadeMin != null,
    f.reacao !== "todas",
    f.soComFotos,
  ].filter(Boolean).length;
}

function comparar(ordem: OrdemVitrine) {
  return (a: ItemVitrineBase, b: ItemVitrineBase): number => {
    switch (ordem) {
      case "menor_preco":
        return a.precoCentavos - b.precoCentavos || a.posicao - b.posicao;
      case "maior_preco":
        return b.precoCentavos - a.precoCentavos || a.posicao - b.posicao;
      case "mais_novas":
        return b.criadaEm.localeCompare(a.criadaEm);
      case "mais_perto":
        return (
          (a.segundosDoEncontro ?? Number.POSITIVE_INFINITY) - (b.segundosDoEncontro ?? Number.POSITIVE_INFINITY) ||
          a.posicao - b.posicao
        );
      default:
        return a.posicao - b.posicao;
    }
  };
}

/**
 * Monta a vitrine: as mais curtidas sempre em primeiro (mesmo fora do filtro), depois as demais
 * filtradas e ordenadas.
 */
export function montarVitrine<T extends ItemVitrineBase>(
  itens: T[],
  filtros: FiltrosVitrine,
  ordem: OrdemVitrine,
): { destaques: T[]; demais: T[]; escondidas: number } {
  const topo = maisCurtidas(itens);
  const destaques = itens.filter((i) => topo.has(i.id)).sort((a, b) => a.posicao - b.posicao);
  const resto = itens.filter((i) => !topo.has(i.id));
  const demais = resto.filter((i) => passaNoFiltro(i, filtros)).sort(comparar(ordem));
  return { destaques, demais, escondidas: resto.length - demais.length };
}

/** Texto da estalagem na lista "Para" das rotas, com a marcação de definida, mais votada ou posição. */
export function rotuloEstalagemNaRota(e: {
  nome: string;
  definida: boolean;
  maisCurtida: boolean;
  empate: boolean;
  curtidas: number;
  posicao: number;
}): string {
  const curtidas = e.curtidas > 0 ? ` (${e.curtidas} ${e.curtidas === 1 ? "curtida" : "curtidas"})` : "";
  if (e.definida) return `✅ Estalagem definida: ${e.nome}`;
  if (e.maisCurtida) return `⭐ Mais votada${e.empate ? " (empate)" : ""}: ${e.nome}${curtidas}`;
  return `Estalagem ${e.posicao}º: ${e.nome}${curtidas}`;
}
