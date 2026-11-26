import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Explicação recolhida: uma frase curta sempre à vista (opcional) e um "Como funciona?" que abre
 * o texto completo. Para quem usa toda semana não precisar ler o mesmo parágrafo sempre.
 */
export function Ajuda({
  resumo,
  children,
  rotulo = "Como funciona?",
  className,
}: {
  resumo?: React.ReactNode;
  children: React.ReactNode;
  rotulo?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      {resumo && <p>{resumo}</p>}
      <details className="group mt-1">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-bottle select-none hover:underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <CircleHelp className="size-3.5" aria-hidden /> {rotulo}
        </summary>
        <div className="mt-1.5 rounded-md border border-border bg-surface/60 p-2.5 leading-relaxed">{children}</div>
      </details>
    </div>
  );
}
