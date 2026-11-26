import { LINHAS_DA_PILHA, moedasDaPilha, posicoesDaPilha } from "@/lib/finance/tesouro";
import { cn } from "@/lib/utils";

const LARGURA_MOEDA = 22;
const ALTURA_LINHA = 8;

/**
 * Pilha de ouro do baú: cresce de baixo para cima conforme o progresso da meta (até 36 moedas).
 * As moedas "caem" no lugar quando a página abre (sem animação com "reduzir movimento").
 */
export function PilhaDeOuro({ progresso, className }: { progresso: number; className?: string }) {
  const moedas = posicoesDaPilha(moedasDaPilha(progresso));
  const largura = LINHAS_DA_PILHA * LARGURA_MOEDA + 16;
  const base = 96;
  const brilho = 0.15 + Math.min(100, Math.max(0, progresso)) / 140;
  return (
    <svg
      viewBox={`0 0 ${largura} 110`}
      role="img"
      aria-label={`Pilha de ouro: ${Math.round(progresso)}% da meta`}
      className={cn("pilha-de-ouro block w-full max-w-64", className)}
      data-pilha
    >
      <defs>
        <radialGradient id="pilha-brilho" cx="50%" cy="75%" r="60%">
          <stop offset="0" stopColor="#ffd98a" stopOpacity={brilho} />
          <stop offset="1" stopColor="#f2a541" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pilha-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1c7" />
          <stop offset="0.45" stopColor="#f2c15a" />
          <stop offset="1" stopColor="#c98a2a" />
        </linearGradient>
      </defs>
      <ellipse cx={largura / 2} cy={base - 10} rx={largura / 2} ry="44" fill="url(#pilha-brilho)" />
      <path d={`M4 ${base + 6} H${largura - 4} L${largura - 12} ${base + 14} H12 Z`} fill="#3a2f27" />
      <path d={`M4 ${base + 6} H${largura - 4}`} stroke="#5c4d40" strokeWidth="2" />
      {moedas.length === 0 && (
        <text x={largura / 2} y={base - 6} textAnchor="middle" fontSize="10" fill="#cdb999">
          O baú ainda está vazio
        </text>
      )}
      {moedas.map(({ linha, coluna }, i) => {
        const cx = 8 + linha * (LARGURA_MOEDA / 2) + coluna * LARGURA_MOEDA + LARGURA_MOEDA / 2;
        const cy = base - linha * ALTURA_LINHA;
        return (
          <g key={i} className="moeda-cai" style={{ animationDelay: `${i * 35}ms` }}>
            <ellipse cx={cx} cy={cy + 2.5} rx="10" ry="4.5" fill="#8a5b20" />
            <ellipse cx={cx} cy={cy} rx="10" ry="4.5" fill="url(#pilha-face)" stroke="#a8742a" strokeWidth="0.8" />
            <ellipse cx={cx} cy={cy} rx="5.5" ry="2.2" fill="none" stroke="#c98a2a" strokeWidth="0.7" opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}
