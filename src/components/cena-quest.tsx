import type { Fase } from "@/lib/aventura";
import { cn } from "@/lib/utils";

/**
 * Cenas temáticas (SVG desenhado à mão) para o topo dos cards no estilo "quest" de jogo.
 * Cada fase da aventura tem uma cena: estrada sob a lua (datas), estalagem acesa (estalagens),
 * acampamento com fogueira (presença), baú com moedas sobre pedras (preparativos),
 * bandeira no pico (concluída) e ruínas na chuva (cancelada). As chamas tremulam com a classe "chama".
 */
export type Cena = "estrada" | "estalagem" | "fogueira" | "bau" | "pico" | "ruinas" | "lareira";

export const CENA_DA_FASE: Record<Fase, Cena> = {
  datas: "estrada",
  estalagens: "estalagem",
  presenca: "fogueira",
  preparativos: "bau",
  concluida: "pico",
  cancelada: "ruinas",
};

export type Moldura = "ouro" | "verde" | "prata";

export const MOLDURA_DA_FASE: Record<Fase, Moldura> = {
  datas: "ouro",
  estalagens: "ouro",
  presenca: "ouro",
  preparativos: "verde",
  concluida: "prata",
  cancelada: "prata",
};

export function CenaQuest({ cena, idBase, className }: { cena: Cena; idBase: string; className?: string }) {
  const g = (n: string) => `${idBase}-${n}`;
  return (
    <svg
      viewBox="0 0 320 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <linearGradient id={g("ceu")} x1="0" y1="0" x2="0" y2="1">
          {cena === "estrada" && (
            <>
              <stop offset="0" stopColor="#120f2a" />
              <stop offset="1" stopColor="#3b2d4f" />
            </>
          )}
          {cena === "estalagem" && (
            <>
              <stop offset="0" stopColor="#2b1b2e" />
              <stop offset="0.6" stopColor="#a04a2a" />
              <stop offset="1" stopColor="#e39a4a" />
            </>
          )}
          {(cena === "fogueira" || cena === "lareira") && (
            <>
              <stop offset="0" stopColor="#0d0a12" />
              <stop offset="1" stopColor="#2a1a14" />
            </>
          )}
          {cena === "bau" && (
            <>
              <stop offset="0" stopColor="#1a120c" />
              <stop offset="1" stopColor="#3a2818" />
            </>
          )}
          {cena === "pico" && (
            <>
              <stop offset="0" stopColor="#2a3550" />
              <stop offset="0.7" stopColor="#d7875a" />
              <stop offset="1" stopColor="#f6c879" />
            </>
          )}
          {cena === "ruinas" && (
            <>
              <stop offset="0" stopColor="#23262c" />
              <stop offset="1" stopColor="#4a4e57" />
            </>
          )}
        </linearGradient>
        <radialGradient id={g("luz")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f2a541" stopOpacity="0" />
        </radialGradient>
        <pattern id={g("pedras")} width="40" height="16" patternUnits="userSpaceOnUse">
          <rect width="40" height="16" fill="#2a221c" />
          <rect x="1" y="1" width="18" height="6.5" rx="2.5" fill="#4a3f36" />
          <rect x="21" y="1" width="18" height="6.5" rx="2.5" fill="#433830" />
          <rect x="-9" y="8.5" width="18" height="6.5" rx="2.5" fill="#3f352d" />
          <rect x="11" y="8.5" width="18" height="6.5" rx="2.5" fill="#4b4037" />
          <rect x="31" y="8.5" width="18" height="6.5" rx="2.5" fill="#3f352d" />
        </pattern>
      </defs>
      <rect width="320" height="120" fill={`url(#${g("ceu")})`} />

      {cena === "estrada" && (
        <>
          {[
            [30, 18],
            [70, 32],
            [120, 12],
            [200, 26],
            [260, 14],
            [290, 40],
            [160, 38],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="#f3e6cf" opacity="0.8" />
          ))}
          <circle cx="238" cy="34" r="26" fill={`url(#${g("luz")})`} opacity="0.5" />
          <circle cx="238" cy="34" r="12" fill="#f3e6cf" />
          <circle cx="243" cy="30" r="10" fill="#d9cdb6" opacity="0.35" />
          <path d="M0 78 Q60 56 120 70 T240 64 T320 70 V120 H0z" fill="#241c33" />
          <path d="M0 92 Q80 72 170 86 T320 84 V120 H0z" fill="#1a1422" />
          <path
            d="M150 120 C150 104 178 96 172 86 C168 80 184 74 196 72"
            stroke="#8f7a5c"
            strokeWidth="10"
            fill="none"
          />
          <path
            d="M150 120 C150 104 178 96 172 86 C168 80 184 74 196 72"
            stroke="#b39a72"
            strokeWidth="3"
            fill="none"
            strokeDasharray="5 6"
          />
          <path d="M92 104 v-26" stroke="#5a3e26" strokeWidth="3" />
          <path d="M80 80 h24 l5 4 -5 4 h-24z" fill="#7a5530" />
        </>
      )}

      {cena === "estalagem" && (
        <>
          <circle cx="70" cy="86" r="22" fill="#ffd98a" opacity="0.6" />
          <path d="M0 96 Q100 86 200 94 T320 92 V120 H0z" fill="#1f1512" />
          <path d="M150 58 L200 30 L250 58z" fill="#2a1a14" />
          <rect x="158" y="58" width="84" height="42" fill="#3a2418" />
          <rect x="222" y="24" width="10" height="22" fill="#2a1a14" />
          <path d="M227 22 q-6 -8 2 -12 q8 -4 2 -10" stroke="#cdb999" strokeWidth="3" fill="none" opacity="0.35" />
          <rect x="168" y="68" width="16" height="14" fill="#ffcf6b" />
          <rect x="216" y="68" width="16" height="14" fill="#ffcf6b" />
          <rect x="192" y="78" width="16" height="22" fill="#1d1611" />
          <circle cx="176" cy="75" r="16" fill={`url(#${g("luz")})`} opacity="0.5" />
          <circle cx="224" cy="75" r="16" fill={`url(#${g("luz")})`} opacity="0.5" />
          <path d="M150 64 h-16" stroke="#5a3e26" strokeWidth="2.5" />
          <rect x="128" y="66" width="14" height="10" fill="#7a5530" stroke="#c99a5b" strokeWidth="1" />
          <path d="M0 120 V108 H320 V120z" fill={`url(#${g("pedras")})`} />
        </>
      )}

      {(cena === "fogueira" || cena === "lareira") && (
        <>
          {cena === "fogueira" ? (
            <>
              <path d="M30 100 L62 54 L94 100z" fill="#3a2418" />
              <path d="M62 54 L70 100 H62z" fill="#2a1a14" />
              <path d="M226 100 L262 48 L298 100z" fill="#3a2418" />
              <path d="M262 48 L272 100 H262z" fill="#2a1a14" />
            </>
          ) : (
            <path d="M110 120 V40 Q160 14 210 40 V120z" fill="#2a1f17" stroke="#4a3725" strokeWidth="6" />
          )}
          <path d="M0 100 H320 V120 H0z" fill={`url(#${g("pedras")})`} />
          <circle cx="160" cy="88" r="46" fill={`url(#${g("luz")})`} />
          <path d="M138 104 l44 -10 M138 94 l44 10" stroke="#5a3e26" strokeWidth="6" strokeLinecap="round" />
          <path
            className="chama"
            d="M160 52 c12 12 16 22 16 30 a16 16 0 0 1 -32 0 c0 -6 3 -11 7 -15 c.5 5 3 8 6 9 c-2 -9 -1 -16 3 -24z"
            fill="#f2a541"
          />
          <path
            className="chama"
            d="M160 68 c6 6 8 11 8 15 a8 8 0 0 1 -16 0 c0 -4 2 -7 4 -9 c0 3 1 4 3 5 c-1 -4 0 -8 1 -11z"
            fill="#fff4d6"
          />
        </>
      )}

      {cena === "bau" && (
        <>
          <path d="M0 84 H320 V120 H0z" fill={`url(#${g("pedras")})`} />
          <circle cx="160" cy="70" r="60" fill={`url(#${g("luz")})`} opacity="0.75" />
          <path d="M122 70 H198 V104 H122z" fill="#6b3f1f" stroke="#2a1a14" strokeWidth="2" />
          <path d="M122 70 Q160 42 198 70z" fill="#7d4a24" stroke="#2a1a14" strokeWidth="2" />
          <path d="M122 70 H198" stroke="#c99a5b" strokeWidth="4" />
          <path d="M140 52 V104 M180 52 V104" stroke="#c99a5b" strokeWidth="3" opacity="0.8" />
          <rect x="154" y="72" width="12" height="12" rx="2" fill="#f2a541" stroke="#2a1a14" strokeWidth="1.5" />
          {[
            [100, 104],
            [110, 100],
            [212, 104],
            [224, 101],
            [204, 98],
            [96, 96],
          ].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="7" ry="3" fill="#f2c15a" stroke="#8a5b20" strokeWidth="1" />
          ))}
          <circle cx="186" cy="40" r="1.6" fill="#fff4d6" />
          <circle cx="132" cy="36" r="1.2" fill="#fff4d6" />
        </>
      )}

      {cena === "pico" && (
        <>
          <circle cx="250" cy="96" r="30" fill="#ffd98a" opacity="0.7" />
          <path d="M0 120 L70 58 L110 84 L170 30 L240 96 L280 70 L320 98 V120z" fill="#2e2a3a" />
          <path d="M170 30 L184 44 L174 42 L166 48 L160 40z" fill="#e7e3ea" />
          <path d="M170 30 V8" stroke="#c99a5b" strokeWidth="2" />
          <path d="M171 9 h18 l-5 5 5 5 h-18z" fill="#9bd394" />
          <path d="M0 120 L50 96 L120 110 L200 100 L320 114 V120z" fill="#1d1a26" />
        </>
      )}

      {cena === "ruinas" && (
        <>
          {Array.from({ length: 18 }, (_, i) => (
            <path key={i} d={`M${i * 19 + 4} ${(i * 37) % 60} l-6 16`} stroke="#9aa3b2" strokeWidth="1" opacity="0.5" />
          ))}
          <path d="M0 100 H320 V120 H0z" fill={`url(#${g("pedras")})`} opacity="0.7" />
          <rect x="96" y="40" width="20" height="60" fill="#5c6168" />
          <path d="M196 64 h20 v36 h-20z M194 64 l6 -8 l6 6 l6 -4 l6 6z" fill="#5c6168" />
          <rect x="90" y="34" width="32" height="8" fill="#6f747c" />
          <path d="M130 100 l14 -6 l10 6z" fill="#4a4e57" />
        </>
      )}
    </svg>
  );
}
