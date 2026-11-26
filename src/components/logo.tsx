import { useId } from "react";

import { cn } from "@/lib/utils";

/*
 * Marca da Taverna O Lobby (refeita em 26/11/2026 a partir da ideia do dono): caneca de madeira com
 * espuma e um d20 na frente. <Logo> é a versão compacta (topo, ícone do app); <LogoBrasao> é a placa
 * completa com o nome, para a página inicial e a tela de entrar.
 */

/** Desenho da caneca + d20 dentro de um viewBox 64×64 (reaproveitado no brasão). */
function CanecaEDado({ p, dado = true }: { p: string; dado?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${p}lg-madeira`} x1="0" x2="1">
          <stop offset="0" stopColor="#6b3d18" />
          <stop offset="0.35" stopColor="#a8682e" />
          <stop offset="0.7" stopColor="#8a5222" />
          <stop offset="1" stopColor="#4e2c11" />
        </linearGradient>
        <linearGradient id={`${p}lg-ferro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9adb2" />
          <stop offset="0.5" stopColor="#6b6f75" />
          <stop offset="1" stopColor="#3f4247" />
        </linearGradient>
        <linearGradient id={`${p}lg-ouro`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe2a0" />
          <stop offset="0.45" stopColor="#f2a541" />
          <stop offset="1" stopColor="#9a4f14" />
        </linearGradient>
      </defs>
      {/* alça */}
      <path
        d="M44 27h4.5a7.5 7.5 0 0 1 7.5 7.5v6a7.5 7.5 0 0 1-7.5 7.5H44"
        fill="none"
        stroke="#3a210c"
        strokeWidth="6.5"
      />
      <path
        d="M44 27h4.5a7.5 7.5 0 0 1 7.5 7.5v6a7.5 7.5 0 0 1-7.5 7.5H44"
        fill="none"
        stroke={`url(#${p}lg-madeira)`}
        strokeWidth="3.6"
      />
      {/* corpo */}
      <rect
        x="17"
        y="21"
        width="28"
        height="35"
        rx="3"
        fill={`url(#${p}lg-madeira)`}
        stroke="#3a210c"
        strokeWidth="1.6"
      />
      <path d="M24 22v33M31 22v33M38 22v33" stroke="#3a210c" strokeWidth="1" opacity="0.55" />
      <rect
        x="16"
        y="26"
        width="30"
        height="4.2"
        rx="1"
        fill={`url(#${p}lg-ferro)`}
        stroke="#2a2c30"
        strokeWidth="0.8"
      />
      <rect
        x="16"
        y="47"
        width="30"
        height="4.2"
        rx="1"
        fill={`url(#${p}lg-ferro)`}
        stroke="#2a2c30"
        strokeWidth="0.8"
      />
      <g fill="#d9dde2">
        <circle cx="20" cy="28.1" r="0.8" />
        <circle cx="31" cy="28.1" r="0.8" />
        <circle cx="42" cy="28.1" r="0.8" />
        <circle cx="31" cy="49.1" r="0.8" />
        <circle cx="42" cy="49.1" r="0.8" />
      </g>
      {
        <path
          d="M14.5 23.5c-2.6-3.4.2-7.6 4.2-6.4.6-4.2 6.2-5.6 8.6-2.4 2-3.6 8.6-3.8 10.2.4 3.6-1.6 7.6 1.6 6.4 5.2 2.2 1.2 2 4.2-.4 4.8-1.6.4-2.8-.6-3.6-1.2-1 1.4-3.4 1.6-4.6.2-1.2 1.6-3.8 1.4-4.8 0-.8.8-1.6 1.2-2.4 1.2v6.4a2.2 2.2 0 0 1-4.4 0V24.6c-1.8.8-4.6.6-5.2-1.1z"
          fill="#f8e7bd"
          stroke="#c99a5b"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      }
      {dado && (
        <g transform="translate(15.5 46)">
          <D20 p={p} />
        </g>
      )}
    </>
  );
}

/** d20 centrado em (0,0), com a face do 20 para cima. */
function D20({ p }: { p: string }) {
  return (
    <>
      <polygon
        points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
        fill={`url(#${p}lg-ouro)`}
        stroke="#4a240b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M0 -6.6 L-5.8 3.6 H5.8 Z M0 -12 L0 -6.6 M10.4 -6 L0 -6.6 M10.4 -6 L5.8 3.6 M10.4 6 L5.8 3.6 M0 12 L5.8 3.6 M0 12 L-5.8 3.6 M-10.4 6 L-5.8 3.6 M-10.4 -6 L-5.8 3.6 M-10.4 -6 L0 -6.6"
        fill="none"
        stroke="#4a240b"
        strokeWidth="0.9"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <text
        x="0"
        y="1.9"
        textAnchor="middle"
        fontSize="5.4"
        fontWeight="700"
        fill="#3a1a06"
        style={{ fontFamily: "var(--font-titulo), Georgia, serif" }}
      >
        20
      </text>
    </>
  );
}

/** Marca compacta (caneca + d20). */
export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  const p = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Taverna O Lobby"
      className={cn("shrink-0", className)}
    >
      <CanecaEDado p={p} />
    </svg>
  );
}

/** d6 em perspectiva com as faces 1, 2 e 3 (as três se encontram num canto, como num dado de verdade). */
function D6() {
  return (
    <g strokeLinejoin="round">
      <path d="M0 -14 L13 -7 L0 0 L-13 -7 Z" fill="#fbf1da" stroke="#4a2a10" strokeWidth="1.6" />
      <path d="M-13 -7 L0 0 L0 15 L-13 8 Z" fill="#e3cfa6" stroke="#4a2a10" strokeWidth="1.6" />
      <path d="M13 -7 L0 0 L0 15 L13 8 Z" fill="#cdb58a" stroke="#4a2a10" strokeWidth="1.6" />
      <g fill="#3a1a06">
        <ellipse cx="0" cy="-7" rx="2" ry="1.2" />
        <circle cx="-9.5" cy="-1" r="1.3" />
        <circle cx="-3.5" cy="7.5" r="1.3" />
        <circle cx="3.4" cy="0.6" r="1.2" />
        <circle cx="6.5" cy="4.2" r="1.2" />
        <circle cx="9.6" cy="7.8" r="1.2" />
      </g>
    </g>
  );
}

/** Meeple (peão de jogo de tabuleiro) para a fita do brasão. */
const MEEPLE =
  "M0 -9a3.6 3.6 0 0 1 3.6 3.6c0 1.4-.8 2.4-1.6 3 2.6.6 6.4 1.6 7.4 2.8.8 1-.4 2.4-2.2 2.2-1.4-.1-2.6-.4-3.4-.4.6 2 2.8 4.8 3.6 6.8.4 1-.2 1.4-1.2 1.4H2.2c-.8 0-1.2-.4-1.4-1.2L0 5.6l-.8 2.6c-.2.8-.6 1.2-1.4 1.2h-4c-1 0-1.6-.4-1.2-1.4.8-2 3-4.8 3.6-6.8-.8 0-2 .3-3.4.4-1.8.2-3-1.2-2.2-2.2 1-1.2 4.8-2.2 7.4-2.8-.8-.6-1.6-1.6-1.6-3A3.6 3.6 0 0 1 0-9z";

/** Brasão completo: caneca, dados, placa de madeira com o nome e fita com o meeple. */
export function LogoBrasao({ className, largura = 320 }: { className?: string; largura?: number }) {
  const fonte = { fontFamily: "var(--font-titulo), Georgia, serif" };
  const p = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 400 300"
      width={largura}
      height={(largura * 300) / 400}
      role="img"
      aria-label="Taverna O Lobby"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${p}lb-placa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3a1f" />
          <stop offset="0.5" stopColor="#3f2814" />
          <stop offset="1" stopColor="#2a1a0c" />
        </linearGradient>
        <linearGradient id={`${p}lb-borda`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe2a0" />
          <stop offset="0.3" stopColor="#c98a35" />
          <stop offset="0.55" stopColor="#f2c15a" />
          <stop offset="0.8" stopColor="#8a5220" />
          <stop offset="1" stopColor="#e8b85a" />
        </linearGradient>
        <linearGradient id={`${p}lb-texto`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9b8" />
          <stop offset="0.55" stopColor="#f2a541" />
          <stop offset="1" stopColor="#c46f1c" />
        </linearGradient>
        <linearGradient id={`${p}lb-fita`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dfb2" />
          <stop offset="1" stopColor="#c9a46a" />
        </linearGradient>
        <pattern id={`${p}lb-veios`} width="400" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 3.5 Q100 1.5 200 3.5 T400 3.5" stroke="#000" strokeOpacity="0.18" fill="none" strokeWidth="1" />
        </pattern>
      </defs>

      {/* caneca e dados por trás da placa */}
      <g transform="translate(272 84) rotate(14) scale(1.55)">
        <D6 />
      </g>
      <g transform="translate(136 78) rotate(-12) scale(1.75)">
        <D20 p={p} />
      </g>
      <g transform="translate(204 58) scale(2) translate(-32 -36)">
        <CanecaEDado p={p} dado={false} />
      </g>

      <g transform="translate(0 30)">
        {/* placa */}
        <path
          d="M62 84 L96 70 H304 L338 84 L372 132 L338 180 L304 194 H96 L62 180 L28 132 Z"
          fill={`url(#${p}lb-placa)`}
          stroke={`url(#${p}lb-borda)`}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M62 84 L96 70 H304 L338 84 L372 132 L338 180 L304 194 H96 L62 180 L28 132 Z"
          fill={`url(#${p}lb-veios)`}
        />
        <path
          d="M70 92 L100 80 H300 L330 92 L360 132 L330 172 L300 184 H100 L70 172 L40 132 Z"
          fill="none"
          stroke="#1a0f06"
          strokeWidth="2"
          opacity="0.8"
        />
        <g fill={`url(#${p}lb-borda)`}>
          <circle cx="96" cy="80" r="2.6" />
          <circle cx="304" cy="80" r="2.6" />
          <circle cx="96" cy="184" r="2.6" />
          <circle cx="304" cy="184" r="2.6" />
          <path d="M200 64 l6 6 -6 6 -6 -6z" stroke="#4a240b" strokeWidth="1" />
        </g>

        <text
          x="200"
          y="118"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          letterSpacing="5"
          fill="#f3e6cf"
          stroke="#1a0f06"
          strokeWidth="3"
          paintOrder="stroke"
          style={fonte}
        >
          TAVERNA
        </text>
        <text
          x="200"
          y="170"
          textAnchor="middle"
          fontSize="54"
          fontWeight="700"
          letterSpacing="2"
          fill={`url(#${p}lb-texto)`}
          stroke="#1a0f06"
          strokeWidth="4"
          paintOrder="stroke"
          style={fonte}
        >
          O LOBBY
        </text>

        {/* fita com o meeple */}
        <path d="M112 206 L90 200 L100 216 L90 232 L122 230 Z" fill="#a8824a" stroke="#4a2a10" strokeWidth="1.5" />
        <path d="M288 206 L310 200 L300 216 L310 232 L278 230 Z" fill="#a8824a" stroke="#4a2a10" strokeWidth="1.5" />
        <path
          d="M110 196 Q200 214 290 196 L290 226 Q200 244 110 226 Z"
          fill={`url(#${p}lb-fita)`}
          stroke="#4a2a10"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M134 213 Q164 220 184 221 M216 221 Q236 220 266 213" stroke="#6b4420" strokeWidth="1.6" fill="none" />
        <g transform="translate(200 220)" fill="#4a2a10">
          <path d={MEEPLE} />
        </g>
      </g>
    </svg>
  );
}
