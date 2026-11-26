import { cn } from "@/lib/utils";

/**
 * Ícones próprios da Taverna (traço grosso + preenchimento âmbar suave).
 * Desenhados em 24×24; a cor vem de `currentColor` e o preenchimento usa o âmbar da vela.
 */
type Props = { className?: string; titulo?: string };

function Icone({ className, titulo, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6 shrink-0", className)}
      role={titulo ? "img" : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      {children}
    </svg>
  );
}

const F = { fill: "var(--gold)", fillOpacity: 0.22, stroke: "currentColor" } as const;

/** Estandarte: painel da aventura. */
export const IconeEstandarte = (p: Props) => (
  <Icone {...p}>
    <path d="M5 3v18" />
    <path d="M5 4h13l-3 4.5 3 4.5H5" {...F} />
    <path d="M9 7.5l1 1.5 1.8-.3" />
  </Icone>
);

/** Mapa com rota: geral e rotas. */
export const IconeMapa = (p: Props) => (
  <Icone {...p}>
    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" {...F} />
    <path d="M9 4v14M15 6v14" opacity={0.5} />
    <path d="M6 14c2-1 3-4 6-3s3 3 6-1" strokeDasharray="1.5 2" />
  </Icone>
);

/** Pergaminho com selo: datas. */
export const IconePergaminho = (p: Props) => (
  <Icone {...p}>
    <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" {...F} />
    <path d="M6 4a2 2 0 0 0-2 2v1h2" />
    <path d="M9 9h7M9 12h7M9 15h3" />
    <circle cx="16" cy="16.5" r="1.8" fill="var(--alert)" stroke="none" />
  </Icone>
);

/** Estalagem: casinha com placa e lamparina. */
export const IconeEstalagem = (p: Props) => (
  <Icone {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" {...F} />
    <path d="M10 20v-5h4v5" />
    <path d="M17 13v2M16 15h2v2h-2z" />
  </Icone>
);

/** Escudo com marca: presença. */
export const IconeEscudo = (p: Props) => (
  <Icone {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" {...F} />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Icone>
);

/** Saco de mantimentos: armazém. */
export const IconeMantimentos = (p: Props) => (
  <Icone {...p}>
    <path d="M8 7c-3 2-4 6-4 9a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-3-1-7-4-9" {...F} />
    <path d="M8 7h8l-1.5-3h-5z" />
    <path d="M9 13c1 1 5 1 6 0" />
  </Icone>
);

/** Balança: custos e divisão. */
export const IconeBalanca = (p: Props) => (
  <Icone {...p}>
    <path d="M12 4v16M8 20h8M5 7h14" />
    <path d="M5 7l-3 6a3 3 0 0 0 6 0z" {...F} />
    <path d="M19 7l-3 6a3 3 0 0 0 6 0z" {...F} />
  </Icone>
);

/** Baú de tesouro: caixinha. */
export const IconeBau = (p: Props) => (
  <Icone {...p}>
    <path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1H3z" {...F} />
    <path d="M3 11h18v8H3z" {...F} />
    <path d="M7 5v14M17 5v14" opacity={0.5} />
    <rect x="10.5" y="10" width="3" height="4" rx="0.8" fill="var(--gold)" stroke="currentColor" />
  </Icone>
);

/** Pena: editar. */
export const IconePena = (p: Props) => (
  <Icone {...p}>
    <path d="M20 4c-7 0-12 5-13 12l-2 4" />
    <path d="M20 4c0 6-4 11-11 12" {...F} />
    <path d="M10 14l4-4" />
  </Icone>
);

/** Moedas empilhadas. */
export const IconeMoedas = (p: Props) => (
  <Icone {...p}>
    <ellipse cx="9" cy="17" rx="6" ry="2.5" {...F} />
    <path d="M3 17v-3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v3" />
    <ellipse cx="9" cy="14" rx="6" ry="2.5" {...F} />
    <circle cx="17" cy="8" r="4" {...F} />
    <path d="M17 6.5v3" />
  </Icone>
);

/** Caneca. */
export const IconeCaneca = (p: Props) => (
  <Icone {...p}>
    <path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" {...F} />
    <path d="M15 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
    <path d="M5 8c0-2 1.5-3 3-2.5C8.5 4 11 3.5 12 5c1.5-.5 3 .5 3 3" />
  </Icone>
);

/** Dado d20. */
export const IconeD20 = (p: Props) => (
  <Icone {...p}>
    <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" {...F} />
    <path d="M12 2v6M8 14h8l-4-6zM8 14l4 8 4-8M3.5 7L8 14M20.5 7L16 14" opacity={0.75} />
  </Icone>
);

/** Ampulheta: contagem regressiva. */
export const IconeAmpulheta = (p: Props) => (
  <Icone {...p}>
    <path d="M6 3h12M6 21h12" />
    <path d="M7 3c0 5 5 6 5 9s-5 4-5 9h10c0-5-5-6-5-9s5-4 5-9" {...F} />
  </Icone>
);

/** Tocha. */
export const IconeTocha = (p: Props) => (
  <Icone {...p}>
    <path d="M10 11h4l-1 10h-2z" />
    <path
      className="chama"
      d="M12 2c3 3 4 5 4 6.5A4 4 0 0 1 8 8.5C8 7 9 6 10 5c.2 1.3.8 2 1.6 2.3C11 5.5 11.3 3.8 12 2z"
      fill="var(--gold)"
      fillOpacity={0.6}
    />
  </Icone>
);

/** Coroa: Mestre da Taverna (admin). */
export const IconeCoroa = (p: Props) => (
  <Icone {...p}>
    <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" {...F} />
    <path d="M5 19h14" />
  </Icone>
);
