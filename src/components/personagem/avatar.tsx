import {
  type Avatar as TipoAvatar,
  AVATARES,
  corDoAvatar,
  iniciais,
  nomeDoEmblema,
  type Papel,
} from "@/lib/personagem";
import { cn } from "@/lib/utils";

const TINTA = "#f3e6cf";
const SOMBRA = "#1d1611";
const OURO = "#f2c15a";
const PAPEL = "#fff8e7";

/** Estrela de 5 pontas centrada em (cx, cy). */
function estrela(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const raio = i % 2 ? r * 0.45 : r;
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + raio * Math.cos(ang)).toFixed(2)} ${(cy + raio * Math.sin(ang)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

/** Espada vertical (ponta em cima), para girar. */
const espada = (
  <>
    <path d="M22.2 10L24 5l1.8 5v19h-3.6z" fill={TINTA} />
    <path d="M24 9v18.5" stroke={SOMBRA} strokeWidth="0.7" opacity="0.5" />
    <rect x="18.5" y="28.6" width="11" height="2.6" rx="1.3" fill={OURO} />
    <rect x="22.7" y="31.2" width="2.6" height="6.4" fill={TINTA} />
    <path d="M22.7 33h2.6M22.7 35.4h2.6" stroke={SOMBRA} strokeWidth="0.7" />
    <circle cx="24" cy="39.2" r="1.7" fill={OURO} />
  </>
);

/**
 * Emblemas desenhados à mão (viewBox 48×48), no mesmo padrão: silhueta em pergaminho sobre a
 * cor do personagem, detalhes em tinta escura e um toque de ouro.
 */
const EMBLEMAS: Record<TipoAvatar, React.ReactNode> = {
  // Espadas cruzadas.
  guerreiro: (
    <>
      <g transform="rotate(-40 24 24)">{espada}</g>
      <g transform="rotate(40 24 24)">{espada}</g>
    </>
  ),
  // Chapéu pontudo com faixa e estrelas.
  maga: (
    <>
      <path d="M15.5 31L23 12.5C25 8 28.5 6 34 7c-4 2-5.8 5-6.4 9.5L32.5 31z" fill={TINTA} />
      <ellipse cx="24" cy="32" rx="15" ry="3.6" fill={TINTA} />
      <path d="M16.6 27.6h15.2l.9 3H15.4z" fill={SOMBRA} opacity="0.75" />
      <rect x="22.4" y="27.3" width="3.2" height="3.6" rx="0.6" fill={OURO} />
      <path d={estrela(24, 20.5, 3.2)} fill={OURO} />
      <path d={estrela(37.5, 13, 1.8)} fill={OURO} />
    </>
  ),
  // Capuz com olhos brilhando e adaga.
  ladino: (
    <>
      <path d="M24 7c-8 3.5-12.5 13-12.5 31h25C36.5 20 32 10.5 24 7z" fill={TINTA} />
      <path d="M24 7c-1.6 3-2 6-1.4 9" stroke={SOMBRA} strokeWidth="0.8" opacity="0.4" fill="none" />
      <ellipse cx="24" cy="25" rx="7" ry="8" fill={SOMBRA} />
      <path d="M19.5 24.2l3.2.9-3 .9zM28.5 24.2l-3.2.9 3 .9z" fill={OURO} />
      <path d="M16 38c1.5-4 4-6.5 8-6.5s6.5 2.5 8 6.5" stroke={SOMBRA} strokeWidth="1" fill="none" opacity="0.45" />
    </>
  ),
  // Alaúde com notas.
  bardo: (
    <>
      <path d="M24.5 23.5L34.5 10" stroke={TINTA} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M33 8.5l3.5-2.5 2.5 3.4-3.5 2.5z" fill={TINTA} />
      <path d="M35 7.6l-1.4-1.2M37.6 11.2l1.5.9" stroke={TINTA} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="19" cy="30" rx="9" ry="10.5" transform="rotate(37 19 30)" fill={TINTA} />
      <circle cx="20.5" cy="28" r="2.7" fill={SOMBRA} />
      <path d="M14.8 35.6l3.3 2.4" stroke={SOMBRA} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.4 36.8L34 11.6" stroke={SOMBRA} strokeWidth="0.5" opacity="0.6" />
      <path d="M38.5 19v7.2" stroke={OURO} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M38.5 19l3 1.4" stroke={OURO} strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="37" cy="26.6" rx="1.9" ry="1.5" fill={OURO} />
    </>
  ),
  // Símbolo sagrado: sol com cruz.
  clerigo: (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M24 5.5l2.3 6h-4.6z" fill={TINTA} transform={`rotate(${i * 45} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="9.5" fill={TINTA} />
      <circle cx="24" cy="24" r="7.6" fill="none" stroke={OURO} strokeWidth="1.2" />
      <path d="M24 18v12.5M19.5 22.5h9" stroke={SOMBRA} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  // Carvalho com bolotas.
  druida: (
    <>
      <path d="M20.6 26h6.8v7.5c0 2 1.8 3.6 5 4.5H15.6c3.2-.9 5-2.5 5-4.5z" fill={TINTA} />
      <path d="M24 26v6M24 30.5l-2.6-2.4M24 29l2.8-2.6" stroke={SOMBRA} strokeWidth="0.9" opacity="0.4" />
      <circle cx="24" cy="15" r="8" fill={TINTA} />
      <circle cx="15.5" cy="19.5" r="6.5" fill={TINTA} />
      <circle cx="32.5" cy="19.5" r="6.5" fill={TINTA} />
      <circle cx="19.5" cy="25" r="5.5" fill={TINTA} />
      <circle cx="28.5" cy="25" r="5.5" fill={TINTA} />
      <circle cx="24" cy="21" r="7" fill={TINTA} />
      <path
        d="M13 21.5c1.6 1.2 3.4 1.6 5.2 1.2M35 21.5c-1.6 1.2-3.4 1.6-5.2 1.2M20 13c1.6-1 3.4-1.2 5-.6M22 27.5c1.4.6 2.8.6 4 0"
        stroke={SOMBRA}
        strokeWidth="0.9"
        fill="none"
        opacity="0.35"
      />
      <path d="M36 38h-24" stroke={SOMBRA} strokeWidth="1" opacity="0.4" />
      <ellipse cx="16.5" cy="17" rx="1.4" ry="1.7" fill={OURO} />
      <ellipse cx="31" cy="23.5" rx="1.4" ry="1.7" fill={OURO} />
      <ellipse cx="27" cy="12.5" rx="1.3" ry="1.6" fill={OURO} />
    </>
  ),
  // Machado duplo.
  anao: (
    <>
      <rect x="22.6" y="8" width="2.8" height="32" rx="1.4" fill={TINTA} />
      <path d="M22.4 13.5Q17 12.5 10 8.2c-3.4 5-3.4 13.6 0 18.6q7-4.4 12.4-5.3z" fill={TINTA} />
      <path d="M25.6 13.5Q31 12.5 38 8.2c3.4 5 3.4 13.6 0 18.6q-7-4.4-12.4-5.3z" fill={TINTA} />
      <path
        d="M11.6 10.6c-2.2 4-2.2 10 0 14M36.4 10.6c2.2 4 2.2 10 0 14"
        stroke={SOMBRA}
        strokeWidth="1"
        fill="none"
        opacity="0.45"
      />
      <rect x="21.3" y="12.6" width="5.4" height="9.6" rx="1.2" fill={OURO} />
      <path d="M24 3.8l1.9 4.4h-3.8z" fill={OURO} />
      <path d="M22.6 30h2.8M22.6 33h2.8M22.6 36h2.8" stroke={SOMBRA} strokeWidth="1" />
      <circle cx="24" cy="41" r="1.9" fill={OURO} />
    </>
  ),
  // Arco tenso com flecha.
  arqueira: (
    <>
      <path d="M16 7.5c11 6 11 27 0 33" stroke={TINTA} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M16 7.5L11.5 24 16 40.5" stroke={TINTA} strokeWidth="0.9" fill="none" />
      <path d="M11.5 24h25" stroke={TINTA} strokeWidth="2" strokeLinecap="round" />
      <path d="M40.5 24l-5.4-3.3v6.6z" fill={OURO} />
      <path d="M11.5 24l-3.2-3.6h3l2.6 3.6-2.6 3.6h-3z" fill={OURO} opacity="0.85" />
      <circle cx="16" cy="7.5" r="1.5" fill={OURO} />
      <circle cx="16" cy="40.5" r="1.5" fill={OURO} />
    </>
  ),
  // Caneca com espuma.
  taverneiro: (
    <>
      <path
        d="M31 19.5h4a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5h-4"
        stroke={TINTA}
        strokeWidth="3"
        fill="none"
      />
      <path d="M12.5 16h19v20.5a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3z" fill={TINTA} />
      <path d="M12.5 21h19M12.5 34.5h19" stroke={SOMBRA} strokeWidth="1" opacity="0.45" />
      <path d="M18 23.5v8.5M22 23.5v8.5M26 23.5v8.5" stroke={SOMBRA} strokeWidth="1" opacity="0.3" />
      <path d="M11.5 16.5c0-3.6 2.8-5.6 5.8-4.8.9-2.9 6.3-3.4 8 0 3-1.1 6.8.7 6.7 4.8z" fill={PAPEL} />
      <circle cx="35" cy="11" r="1.2" fill={PAPEL} />
      <circle cx="37.5" cy="7.5" r="0.9" fill={PAPEL} />
    </>
  ),
  // Cabeça de dragão de perfil, chifres e fogo.
  dragao: (
    <>
      <path
        d="M38 40l-1.5-5 2.5-1.5-3.5-3 2-2.5-4-2.5 1.5-3.5-4-2 6-10-8.5 4.5 5.5-8.5-9 7.5c-4 0-10 2-16 5l.5 3 12.5 2-11 5 .5 2c4.5 0 9.5-.5 12.5-1 2 2.5 3 6.5 3 10.5z"
        fill={TINTA}
      />
      <path d="M12.6 21.1l1 1.7.9-1.5M16.2 21.6l1 1.7.9-1.5M14 28.6l.9-1.5 1 1.4" fill={PAPEL} />
      <path d="M20.5 15.8l5 .4" stroke={SOMBRA} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="23.2" cy="17.8" r="1.5" fill="#e0475a" />
      <circle cx="11.8" cy="19.3" r="0.8" fill={SOMBRA} />
      <path
        d="M27 27c2.5 2.5 3.8 6 4 10M30 25.5l2.6 1.4M31.6 30.5l2.8.4"
        stroke={SOMBRA}
        strokeWidth="0.9"
        opacity="0.4"
        fill="none"
      />
      <path
        d="M14 25.2c-3.2-1.2-6.4-.8-9 .8 2.1-.1 3.7.3 4.7 1.2-1.7.4-3.1 1.3-4 2.8 2.7-1.2 5.4-1.4 8.2-.7z"
        fill="#f2a541"
      />
      <path d="M13.5 25.8c-1.8-.4-3.6-.2-5 .5 1.4.3 2.4.9 3 1.8z" fill={OURO} />
    </>
  ),
  // Elmo fechado com penacho.
  cavaleiro: (
    <>
      <path d="M24 8.5c2-5 8.5-6 12.5-3.2-4-.3-7.5 1.5-9.5 5z" fill="#e0475a" />
      <path d="M14 14c0-4 3.5-6 10-6s10 2 10 6v18c0 4.5-4 8-10 8s-10-3.5-10-8z" fill={TINTA} />
      <path d="M24 8.5v11" stroke={SOMBRA} strokeWidth="0.9" opacity="0.45" />
      <rect x="15.5" y="19.5" width="17" height="2.8" rx="1.4" fill={SOMBRA} />
      <path d="M24 25v12" stroke={SOMBRA} strokeWidth="1.1" opacity="0.6" />
      <path d="M19 27.5h.01M19 31h.01M29 27.5h.01M29 31h.01" stroke={SOMBRA} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 32h20" stroke={OURO} strokeWidth="1.4" />
    </>
  ),
  // Grimório com runa e fecho.
  feiticeiro: (
    <>
      <rect x="15" y="10.5" width="22" height="29" rx="2" fill={PAPEL} />
      <path d="M35 13v24.5M33 13v24.5" stroke={SOMBRA} strokeWidth="0.5" opacity="0.35" />
      <rect x="11.5" y="8.5" width="22.5" height="29.5" rx="2.2" fill={TINTA} />
      <rect x="11.5" y="8.5" width="4" height="29.5" rx="1.6" fill={SOMBRA} opacity="0.3" />
      <path d="M31 8.5h3v3zM31 38h3v-3z" fill={OURO} />
      <circle cx="24.5" cy="23" r="6.6" fill={SOMBRA} />
      <path d={estrela(24.5, 23.4, 5.2)} fill="none" stroke={OURO} strokeWidth="0.9" strokeLinejoin="round" />
      <rect x="32.5" y="20.5" width="4.5" height="5" rx="1" fill={OURO} />
      <path d={estrela(39, 9, 2.2)} fill={OURO} />
    </>
  ),
};

const ARO: Record<Papel, string> = {
  mestre: "#f2c15a",
  tesoureiro: "#9bd394",
  despensa: "#c98a5a",
  membro: "#6e5337",
};

type Props = {
  nome: string;
  avatar?: string | null;
  /** URL (assinada) da foto enviada pela pessoa; tem prioridade sobre o emblema. */
  foto?: string | null;
  cor?: string | null;
  papel?: Papel;
  /** Diâmetro em px. */
  tamanho?: number;
  online?: boolean;
  /** "m" ou "f": nome do emblema lido pelo leitor de tela (Mago ou Maga). */
  sexo?: string | null;
  className?: string;
};

/**
 * Medalhão do personagem: emblema (ou iniciais) sobre a cor escolhida, com aro pela função
 * (ouro e coroa para o Mestre da Taverna, verde para o Guardião do Baú, bronze para o do Armazém).
 */
export function Avatar({ nome, avatar, foto, cor, papel = "membro", tamanho = 40, online, sexo, className }: Props) {
  const fundo = corDoAvatar(nome, cor);
  const emblema = avatar && avatar in AVATARES ? EMBLEMAS[avatar as TipoAvatar] : null;
  const aro = ARO[papel];
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: tamanho, height: tamanho }}
      role="img"
      aria-label={`${nome}${foto ? " (foto)" : ""}${!foto && avatar && avatar in AVATARES ? ` (${nomeDoEmblema(avatar as TipoAvatar, sexo)})` : ""}${online ? ", online" : ""}`}
    >
      <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden className="block">
        <defs>
          <clipPath id="av-recorte">
            <circle cx="24" cy="24" r="21" />
          </clipPath>
          <radialGradient id={`av-${papel}`} cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={fundo} />
        <circle cx="24" cy="24" r="22" fill={`url(#av-${papel})`} />
        {foto ? (
          <image
            href={foto}
            x="3"
            y="3"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#av-recorte)"
          />
        ) : (
          <g transform="translate(2.4 2.4) scale(0.9)">
            {emblema ?? (
              <text
                x="24"
                y="24"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={iniciais(nome).length > 1 ? 18 : 22}
                fontWeight="700"
                fill={TINTA}
                fontFamily="var(--font-titulo), Georgia, serif"
              >
                {iniciais(nome)}
              </text>
            )}
          </g>
        )}
        <circle cx="24" cy="24" r="22" fill="none" stroke={aro} strokeWidth={papel === "membro" ? 2 : 3} />
        {papel !== "membro" && (
          <circle cx="24" cy="24" r="19.6" fill="none" stroke={aro} strokeWidth="0.8" opacity="0.6" />
        )}
      </svg>
      {papel === "mestre" && (
        <svg
          viewBox="0 0 20 12"
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{ width: tamanho * 0.46, top: -tamanho * 0.16 }}
        >
          <path d="M1 11l1.5-9 4 4L10 0l3.5 6 4-4 1.5 9z" fill="#f2c15a" stroke="#7a5220" strokeWidth="0.8" />
        </svg>
      )}
      {online != null && (
        <span
          aria-hidden
          className={cn(
            "absolute right-0 bottom-0 rounded-full border-2 border-[#1d1611]",
            online ? "bg-[#6fdc6f] shadow-[0_0_6px_#6fdc6f]" : "bg-[#5c4d40]",
          )}
          style={{ width: Math.max(9, tamanho * 0.26), height: Math.max(9, tamanho * 0.26) }}
        />
      )}
    </span>
  );
}
