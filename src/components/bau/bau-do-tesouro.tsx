import { escalaDoTesouro, NIVEL_MAXIMO_DO_TESOURO, nivelDoTesouro } from "@/lib/finance/tesouro";
import { cn } from "@/lib/utils";

const NOMES = [
  "fechado e vazio",
  "com as primeiras moedas",
  "com um monte de moedas",
  "com um rubi",
  "com um cálice de ouro",
  "transbordando moedas",
  "com uma esmeralda",
  "com um colar de pérolas",
  "com moedas pelo chão",
  "com uma espada lendária",
  "com a coroa do tesouro",
];

/**
 * Baú do tesouro desenhado: fechado com o baú vazio; abre com o primeiro valor guardado, cresce junto
 * com o progresso da meta e ganha um item novo a cada 10%, até transbordar com a coroa (100%).
 */
export function BauDoTesouro({ progresso, className }: { progresso: number; className?: string }) {
  const n = nivelDoTesouro(progresso);
  const escala = escalaDoTesouro(progresso);
  const aberto = n > 0;
  return (
    <svg
      viewBox="0 0 160 140"
      role="img"
      aria-label={`Baú do tesouro ${NOMES[n]} (nível ${n} de ${NIVEL_MAXIMO_DO_TESOURO})`}
      className={cn("block w-full max-w-56", className)}
    >
      <defs>
        <radialGradient id="bau-brilho" cx="50%" cy="60%" r="55%">
          <stop offset="0" stopColor="#ffd98a" stopOpacity={0.1 + n * 0.06} />
          <stop offset="1" stopColor="#f2a541" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bau-ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c7" />
          <stop offset="0.5" stopColor="#f2c15a" />
          <stop offset="1" stopColor="#b8742a" />
        </linearGradient>
        <linearGradient id="bau-madeira" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5530" />
          <stop offset="1" stopColor="#5a3418" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="96" rx="78" ry="46" fill="url(#bau-brilho)" />
      <ellipse cx="80" cy="131" rx={46 * escala + 8} ry="5" fill="#000" opacity="0.45" />
      <g
        className="bau-cresce"
        style={{ transform: `scale(${escala})`, transformOrigin: "80px 130px", transformBox: "view-box" }}
      >
        {/* Tampa aberta, por trás. */}
        {aberto && (
          <>
            <path d="M40 80 L44 46 Q80 30 116 46 L120 80z" fill="#4a2a14" stroke="#2a1a0c" strokeWidth="2" />
            <path d="M44 46 Q80 30 116 46" stroke="#c99a5b" strokeWidth="4" fill="none" />
            <path d="M62 38 L60 79 M98 38 L100 79" stroke="#c99a5b" strokeWidth="3" opacity="0.7" />
          </>
        )}

        {/* Conteúdo que vai aparecendo. */}
        {n >= 9 && (
          <g>
            <path d="M104 76 L126 30" stroke="#d9dde1" strokeWidth="4" strokeLinecap="round" />
            <path d="M100 66 L114 72" stroke="#c99a5b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="102" cy="80" r="3" fill="#c99a5b" />
          </g>
        )}
        {n >= 1 && <ellipse cx="80" cy="80" rx="38" ry="7" fill="url(#bau-ouro)" />}
        {n >= 2 && <path d="M43 82 Q80 56 117 82z" fill="url(#bau-ouro)" stroke="#a8742a" strokeWidth="1" />}
        {n >= 2 &&
          [
            [60, 72],
            [78, 66],
            [96, 72],
            [70, 78],
            [90, 78],
          ].map(([x, y]) => (
            <ellipse key={`m${x}`} cx={x} cy={y} rx="6" ry="2.6" fill="#f7d98b" stroke="#a8742a" strokeWidth="0.8" />
          ))}
        {n >= 3 && <path d="M60 66 l6 -7 l6 7 l-6 7z" fill="#e0475a" stroke="#7a1a26" strokeWidth="1" />}
        {n >= 4 && (
          <g fill="url(#bau-ouro)" stroke="#8a5b20" strokeWidth="1">
            <path d="M88 48 h16 q0 12 -8 14 q-8 -2 -8 -14z" />
            <rect x="94.5" y="62" width="3" height="6" />
            <ellipse cx="96" cy="69" rx="6" ry="2" />
          </g>
        )}
        {n >= 6 && <path d="M76 58 l5 -6 l5 6 l-5 6z" fill="#4fbf7a" stroke="#1f5a34" strokeWidth="1" />}
        {n >= 10 && (
          <g>
            <path
              d="M64 46 l4 -14 l6 8 l6 -12 l6 12 l6 -8 l4 14z"
              fill="url(#bau-ouro)"
              stroke="#8a5b20"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <circle cx="80" cy="40" r="2.2" fill="#e0475a" />
            <circle cx="70" cy="42" r="1.6" fill="#4fbf7a" />
            <circle cx="90" cy="42" r="1.6" fill="#5a8ae0" />
          </g>
        )}

        {/* Corpo do baú, na frente. */}
        <rect x="40" y="80" width="80" height="48" rx="4" fill="url(#bau-madeira)" stroke="#2a1a0c" strokeWidth="2" />
        <path d="M40 92 H120 M40 116 H120" stroke="#3a2010" strokeWidth="1.5" opacity="0.6" />
        <path d="M40 80 H120" stroke="#c99a5b" strokeWidth="5" />
        <path d="M60 80 V128 M100 80 V128" stroke="#c99a5b" strokeWidth="4" />
        <rect x="73" y="88" width="14" height="16" rx="2" fill="#f2c15a" stroke="#2a1a0c" strokeWidth="1.5" />
        <circle cx="80" cy="95" r="2" fill="#2a1a0c" />
        {!aberto && (
          <>
            <path d="M40 81 Q80 50 120 81z" fill="url(#bau-madeira)" stroke="#2a1a0c" strokeWidth="2" />
            <path d="M60 70 V81 M100 70 V81" stroke="#c99a5b" strokeWidth="4" />
          </>
        )}

        {/* Transbordando por fora. */}
        {n >= 5 &&
          [
            [42, 86, -20],
            [36, 98, 10],
            [118, 88, 25],
          ].map(([x, y, r]) => (
            <ellipse
              key={`t${x}`}
              cx={x}
              cy={y}
              rx="6"
              ry="2.6"
              transform={`rotate(${r} ${x} ${y})`}
              fill="#f7d98b"
              stroke="#a8742a"
              strokeWidth="0.8"
            />
          ))}
        {n >= 7 && (
          <g fill="#f3e6cf" stroke="#b8a888" strokeWidth="0.5">
            {[48, 54, 60, 66, 72].map((x, i) => (
              <circle key={x} cx={x} cy={84 + Math.sin(i / 1.3) * 7} r="2.2" />
            ))}
          </g>
        )}
        {n >= 8 &&
          [
            [24, 128],
            [32, 126],
            [28, 122],
            [130, 128],
            [138, 127],
            [134, 123],
          ].map(([x, y]) => (
            <ellipse
              key={`c${x}-${y}`}
              cx={x}
              cy={y}
              rx="6"
              ry="2.6"
              fill="#f7d98b"
              stroke="#a8742a"
              strokeWidth="0.8"
            />
          ))}
      </g>
    </svg>
  );
}
