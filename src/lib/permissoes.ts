/** Áreas (abas) em que cada pessoa recebe permissão e o que cada ação quer dizer. Espelha a migração 19. */
export const AREAS = [
  "aventura",
  "datas",
  "estalagens",
  "presenca",
  "armazem",
  "custos",
  "bau",
  "membros",
  "chat",
  "permissoes",
] as const;
export type Area = (typeof AREAS)[number];
export type Acao = "ver" | "editar" | "excluir";
export type PermissaoArea = { ver: boolean; editar: boolean; excluir: boolean };
export type Permissoes = Record<Area, PermissaoArea>;

/** Nome temático + palavra comum, e o que "editar" e "excluir" liberam em cada área. */
export const AREA_INFO: Record<Area, { nome: string; comum: string; editar: string; excluir: string }> = {
  aventura: {
    nome: "Aventuras",
    comum: "encontros",
    editar: "criar aventura, mudar nome, período, fase e ponto de encontro",
    excluir: "apagar uma aventura",
  },
  datas: { nome: "Datas", comum: "votação", editar: "cadastrar datas e fechar a votação", excluir: "remover datas" },
  estalagens: {
    nome: "Estalagens",
    comum: "hospedagem",
    editar: "editar qualquer estalagem e escolher a final",
    excluir: "remover estalagens de outras pessoas",
  },
  presenca: { nome: "Presença", comum: "quem vai", editar: "confirmar presença por qualquer pessoa", excluir: "—" },
  armazem: {
    nome: "Armazém",
    comum: "compras",
    editar: "cuidar da lista de compras",
    excluir: "remover itens de outras pessoas",
  },
  custos: { nome: "Custos", comum: "divisão", editar: "lançar e alterar custos e pesos", excluir: "remover custos" },
  bau: {
    nome: "Baú",
    comum: "caixinha",
    editar: "confirmar ou recusar depósitos e registrar saídas",
    excluir: "estornar lançamentos e cancelar cobranças Pix",
  },
  membros: { nome: "Membros", comum: "aprovação", editar: "aprovar membros e gerar novo convite", excluir: "—" },
  chat: {
    nome: "Chat",
    comum: "moderação",
    editar: "marcar dúvidas dos outros como resolvidas",
    excluir: "apagar mensagens dos outros",
  },
  permissoes: {
    nome: "Permissões",
    comum: "quem pode o quê",
    editar: "dar e tirar permissões dos outros membros (nunca as próprias nem as do Mestre)",
    excluir: "—",
  },
};

export function semPermissoes(): Permissoes {
  return Object.fromEntries(AREAS.map((a) => [a, { ver: false, editar: false, excluir: false }])) as Permissoes;
}

export function todasPermissoes(): Permissoes {
  return Object.fromEntries(AREAS.map((a) => [a, { ver: true, editar: true, excluir: true }])) as Permissoes;
}

/** Monta as permissões a partir das linhas de minhas_permissoes() (área desconhecida é ignorada). */
export function lerPermissoes(
  linhas: { area: string; ver: boolean; editar: boolean; excluir: boolean }[] | null,
): Permissoes {
  const p = semPermissoes();
  for (const l of linhas ?? []) {
    if ((AREAS as readonly string[]).includes(l.area)) {
      p[l.area as Area] = { ver: !!l.ver, editar: !!l.editar, excluir: !!l.excluir };
    }
  }
  return p;
}

export function pode(p: Permissoes, area: Area, acao: Acao): boolean {
  return p[area][acao];
}

/** Áreas que a pessoa enxerga no Salão do Mestre, na ordem das abas. */
export function areasVisiveis(p: Permissoes): Area[] {
  return AREAS.filter((a) => p[a].ver);
}

/** A pessoa entra no Salão do Mestre se for o Mestre ou se alguma tag der "ver" em alguma área. */
export function entraNoSalao(p: Permissoes, ehMestre: boolean): boolean {
  return ehMestre || areasVisiveis(p).length > 0;
}

/** Normaliza o que o formulário manda: editar ou excluir sem ver vira ver também (regra do banco). */
export function normalizarPermissao(ver: boolean, editar: boolean, excluir: boolean): PermissaoArea {
  return { ver: ver || editar || excluir, editar, excluir };
}
