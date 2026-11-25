import { cn } from "@/lib/utils";

/**
 * Logo da Taverna O Lobby: lamparina de taverna pendurada, com o vidro em forma de d20
 * e a chama acesa dentro (a chama tremula; para com "reduzir movimento").
 */
export function Logo({ className, size = 40, acesa = true }: { className?: string; size?: number; acesa?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Taverna O Lobby"
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id="logo-luz" cx="50%" cy="58%" r="55%">
          <stop offset="0" stopColor="#FFE2A8" />
          <stop offset="0.45" stopColor="#F2A541" />
          <stop offset="1" stopColor="#8A4B16" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="38" r="22" fill="#F2A541" opacity="0.16" />
      <path d="M32 3v7" stroke="#C99A5B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="4" r="2.5" fill="none" stroke="#C99A5B" strokeWidth="2" />
      <path d="M22 16h20l-3-6H25z" fill="#5A3E26" stroke="#C99A5B" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon
        points="32,16 47,24.5 47,45.5 32,54 17,45.5 17,24.5"
        fill="url(#logo-luz)"
        stroke="#5A3E26"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 16v9M47 24.5 40 37M17 24.5 24 37M24 37h16M24 37l8 17M40 37l-8 17M17 45.5 24 37M47 45.5 40 37"
        stroke="#5A3E26"
        strokeWidth="1.4"
        opacity="0.55"
      />
      <path
        className={acesa ? "chama" : undefined}
        d="M32 26c4.5 5 6 8.5 6 11.5a6 6 0 0 1-12 0c0-2.2 1-4 2.6-5.6.2 2 1 3.2 2.4 3.6-.9-3.4-.3-6.4 1-9.5z"
        fill="#FFF4D6"
      />
      <path d="M24 54h16l-2 5H26z" fill="#5A3E26" stroke="#C99A5B" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
