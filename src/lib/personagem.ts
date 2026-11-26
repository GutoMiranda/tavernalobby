/**
 * Personagem de cada membro (fase 3 do rebranding): avatar temático, cor, epíteto e o papel
 * que decora o nome (Mestre da Taverna, Guardião do Baú, Guardião do Armazém).
 * As listas batem com as checagens da migração 16 (chat_avatares).
 */
export const AVATARES = {
  guerreiro: "Guerreiro",
  maga: "Maga",
  ladino: "Ladino",
  bardo: "Bardo",
  clerigo: "Clérigo",
  druida: "Druida",
  anao: "Anão",
  arqueira: "Arqueira",
  taverneiro: "Taverneiro",
  dragao: "Dragão",
  cavaleiro: "Cavaleiro",
  feiticeiro: "Feiticeiro",
} as const;
export type Avatar = keyof typeof AVATARES;

/** Sexo do personagem (opcional): troca o nome do emblema e o título da função. */
export type Sexo = "m" | "f";
export const SEXOS: Record<Sexo, string> = { m: "Masculino", f: "Feminino" };

const NOMES_EMBLEMA: Record<Avatar, Record<Sexo, string>> = {
  guerreiro: { m: "Guerreiro", f: "Guerreira" },
  maga: { m: "Mago", f: "Maga" },
  ladino: { m: "Ladino", f: "Ladina" },
  bardo: { m: "Bardo", f: "Barda" },
  clerigo: { m: "Clérigo", f: "Clériga" },
  druida: { m: "Druida", f: "Druidesa" },
  anao: { m: "Anão", f: "Anã" },
  arqueira: { m: "Arqueiro", f: "Arqueira" },
  taverneiro: { m: "Taverneiro", f: "Taverneira" },
  dragao: { m: "Dragão", f: "Dragoa" },
  cavaleiro: { m: "Cavaleiro", f: "Cavaleira" },
  feiticeiro: { m: "Feiticeiro", f: "Feiticeira" },
};

export function lerSexo(valor: string | null | undefined): Sexo | null {
  return valor === "m" || valor === "f" ? valor : null;
}

/** Nome do emblema conforme o sexo ("maga" → Mago ou Maga). Sem sexo, o nome padrão. */
export function nomeDoEmblema(avatar: Avatar, sexo?: string | null): string {
  const s = lerSexo(sexo);
  return s ? NOMES_EMBLEMA[avatar][s] : AVATARES[avatar];
}
export const IDS_AVATARES = Object.keys(AVATARES) as Avatar[];

export const CORES_AVATAR = {
  ambar: { nome: "Âmbar", cor: "#b8742a" },
  brasa: { nome: "Brasa", cor: "#a8452f" },
  garrafa: { nome: "Garrafa", cor: "#2f6b3f" },
  noite: { nome: "Noite", cor: "#2b3a6b" },
  vinho: { nome: "Vinho", cor: "#6b2440" },
  pedra: { nome: "Pedra", cor: "#5c6168" },
  floresta: { nome: "Floresta", cor: "#3f5a2a" },
  ouro: { nome: "Ouro", cor: "#9a6a1f" },
} as const;
export type CorAvatar = keyof typeof CORES_AVATAR;
export const IDS_CORES = Object.keys(CORES_AVATAR) as CorAvatar[];

export type Papel = "mestre" | "tesoureiro" | "despensa" | "membro";

export const PAPEIS: Record<Papel, { titulo: string | null; comum: string | null }> = {
  mestre: { titulo: "Mestre da Taverna", comum: "admin" },
  tesoureiro: { titulo: "Guardião do Baú", comum: "tesoureiro" },
  despensa: { titulo: "Guardião do Armazém", comum: "despensa" },
  membro: { titulo: null, comum: null },
};

const TITULOS_FEMININOS: Partial<Record<Papel, string>> = {
  mestre: "Mestra da Taverna",
  tesoureiro: "Guardiã do Baú",
  despensa: "Guardiã do Armazém",
};

/** Título da função conforme o sexo (Guardião ou Guardiã do Baú). */
export function tituloDoPapel(papel: Papel, sexo?: string | null): string | null {
  return (lerSexo(sexo) === "f" ? TITULOS_FEMININOS[papel] : null) ?? PAPEIS[papel].titulo;
}

/** Papel que decora o nome: o mais alto entre admin, Tesoureiro e Despensa. */
export function papelDe(pessoa: { is_admin: boolean }, tags: readonly string[]): Papel {
  if (pessoa.is_admin) return "mestre";
  if (tags.includes("Tesoureiro")) return "tesoureiro";
  if (tags.includes("Despensa")) return "despensa";
  return "membro";
}

/** Iniciais para quem ainda não escolheu avatar ("Gustavo Miranda" → "GM"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/** Cor do avatar: a escolhida ou uma fixa derivada do nome (sempre a mesma para a mesma pessoa). */
export function corDoAvatar(nome: string, cor: string | null | undefined): string {
  if (cor && cor in CORES_AVATAR) return CORES_AVATAR[cor as CorAvatar].cor;
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES_AVATAR[IDS_CORES[h % IDS_CORES.length]].cor;
}

/** Valida o formulário do personagem. Campos vazios voltam a null (sem avatar, cor ou epíteto). */
export function lerPersonagem(dados: { avatar?: string; cor?: string; epiteto?: string; sexo?: string }) {
  const avatar = dados.avatar && (IDS_AVATARES as string[]).includes(dados.avatar) ? (dados.avatar as Avatar) : null;
  const cor = dados.cor && (IDS_CORES as string[]).includes(dados.cor) ? (dados.cor as CorAvatar) : null;
  const epiteto = (dados.epiteto ?? "").trim().replace(/\s+/g, " ");
  if (epiteto.length > 40) return { erro: "O epíteto pode ter até 40 caracteres." } as const;
  return { avatar, cor, epiteto: epiteto || null, sexo: lerSexo(dados.sexo) } as const;
}

const CAMINHO_FOTO = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/;

/**
 * Caminho da foto do avatar que o formulário pode gravar: vazio (sem foto), a foto que a pessoa
 * já tem, ou uma foto nova enviada agora por quem está logado (pasta = id do login).
 */
export function caminhoDeFotoValido(caminho: string, userId: string, atual: string | null): string | null | false {
  if (!caminho) return null;
  if (caminho === atual) return caminho;
  if (CAMINHO_FOTO.test(caminho) && caminho.startsWith(`${userId}/`)) return caminho;
  return false;
}

/** Recorte quadrado central de uma imagem (para a foto do avatar). */
export function recorteQuadrado(largura: number, altura: number) {
  const lado = Math.min(largura, altura);
  return { x: Math.floor((largura - lado) / 2), y: Math.floor((altura - lado) / 2), lado };
}
