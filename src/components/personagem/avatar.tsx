import { type Avatar as TipoAvatar, AVATARES, corDoAvatar, iniciais, type Papel } from "@/lib/personagem";
import { cn } from "@/lib/utils";

const TINTA = "#f3e6cf";
const SOMBRA = "#1d1611";

/** Emblemas desenhados à mão (viewBox 48×48), em pergaminho sobre a cor do personagem. */
const EMBLEMAS: Record<TipoAvatar, React.ReactNode> = {
  guerreiro: (
    <>
      <path d="M24 6c-2 3-2 5 0 7 2-2 2-4 0-7z" fill="#e0475a" />
      <path d="M13 32V24c0-7 5-11 11-11s11 4 11 11v8h-6v-7h-10v7z" fill={TINTA} />
      <path d="M22 25h4v11h-4z" fill={TINTA} />
      <path d="M17 22h14" stroke={SOMBRA} strokeWidth="1.5" />
    </>
  ),
  maga: (
    <>
      <path d="M9 36h30l-6-4-6-20-4-6-2 10-6 16z" fill={TINTA} />
      <path d="M26 6l3 3-3 1z" fill={TINTA} />
      <path d="M25 20l1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L22 22.3l2-.3z" fill="#f2c15a" />
    </>
  ),
  ladino: (
    <>
      <path d="M11 38c0-16 5-27 13-28 8 1 13 12 13 28z" fill={TINTA} />
      <ellipse cx="24" cy="26" rx="7" ry="8" fill={SOMBRA} />
      <circle cx="21" cy="25" r="1.4" fill="#f2c15a" />
      <circle cx="27" cy="25" r="1.4" fill="#f2c15a" />
    </>
  ),
  bardo: (
    <>
      <circle cx="19" cy="31" r="9" fill={TINTA} />
      <circle cx="19" cy="31" r="2.6" fill={SOMBRA} />
      <path d="M24 26l11-15" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M33 9l5 3-2 3-5-3z" fill={TINTA} />
      <path d="M38 6l1 2M40 10l2 0" stroke="#f2c15a" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  clerigo: (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M24 7v6"
          stroke={TINTA}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="8" fill={TINTA} />
      <path d="M24 19v10M19 24h10" stroke="#c9933f" strokeWidth="2.5" />
    </>
  ),
  druida: (
    <>
      <path d="M12 36C12 20 22 10 37 10c0 15-10 25-25 26z" fill={TINTA} />
      <path d="M13 35L33 14M20 28h-5M25 23l1-6M28 20h5" stroke={SOMBRA} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  anao: (
    <>
      <path d="M22 8h4v32h-4z" fill={TINTA} />
      <path d="M26 10c8 0 12 4 12 10s-4 9-12 9z" fill={TINTA} />
      <path d="M22 10c-8 0-12 4-12 10s4 9 12 9z" fill={TINTA} opacity="0.85" />
      <path d="M22 40h4" stroke="#c9933f" strokeWidth="3" />
    </>
  ),
  arqueira: (
    <>
      <path d="M14 8c12 6 12 26 0 32" stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M14 8v32" stroke={TINTA} strokeWidth="1" />
      <path d="M10 24h28" stroke={TINTA} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M38 24l-5-3v6z" fill="#f2c15a" />
      <path d="M10 24l-3-3M10 24l-3 3" stroke={TINTA} strokeWidth="1.6" />
    </>
  ),
  taverneiro: (
    <>
      <path d="M13 16h18v20a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill={TINTA} />
      <path d="M31 20h4a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4" stroke={TINTA} strokeWidth="3" fill="none" />
      <path d="M12 16c0-4 3-6 6-5 1-3 6-3 8 0 3-1 6 1 6 5z" fill="#fff8e7" />
      <path d="M18 21v13M23 21v13M28 21v13" stroke="#c9933f" strokeWidth="1.5" />
    </>
  ),
  dragao: (
    <>
      <path d="M8 30c4-10 12-16 22-16l4-6 1 7 6 3-4 3 3 7c-6-2-10 0-14 3-5 4-12 3-18-1z" fill={TINTA} />
      <circle cx="31" cy="20" r="1.8" fill="#e0475a" />
      <path d="M10 30l-3 4 5-1" fill="#f2a541" />
    </>
  ),
  cavaleiro: (
    <>
      <path d="M12 10h24v12c0 9-5 15-12 18-7-3-12-9-12-18z" fill={TINTA} />
      <path d="M24 14v20M16 22h16" stroke="#c9933f" strokeWidth="3.5" />
    </>
  ),
  feiticeiro: (
    <>
      <circle cx="24" cy="20" r="10" fill={TINTA} />
      <circle cx="21" cy="17" r="3" fill="#ffffff" opacity="0.8" />
      <path d="M14 34c3-3 6-4 10-4s7 1 10 4l-2 5H16z" fill={TINTA} opacity="0.85" />
      <path
        d="M36 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM10 12l.8 1.6 1.6.8-1.6.8L10 17l-.8-1.6-1.6-.8 1.6-.8z"
        fill="#f2c15a"
      />
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
  className?: string;
};

/**
 * Medalhão do personagem: emblema (ou iniciais) sobre a cor escolhida, com aro pela função
 * (ouro e coroa para o Mestre da Taverna, verde para o Guardião do Baú, bronze para o do Armazém).
 */
export function Avatar({ nome, avatar, foto, cor, papel = "membro", tamanho = 40, online, className }: Props) {
  const fundo = corDoAvatar(nome, cor);
  const emblema = avatar && avatar in AVATARES ? EMBLEMAS[avatar as TipoAvatar] : null;
  const aro = ARO[papel];
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: tamanho, height: tamanho }}
      role="img"
      aria-label={`${nome}${foto ? " (foto)" : ""}${!foto && avatar && avatar in AVATARES ? ` (${AVATARES[avatar as TipoAvatar]})` : ""}${online ? ", online" : ""}`}
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
