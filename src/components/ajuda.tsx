"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Explicação recolhida: uma frase curta sempre à vista (opcional) e um "Como funciona?" que abre
 * o texto completo. No computador abre ao passar o mouse (e fecha ao sair); clicar deixa aberta.
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
  const [aberta, setAberta] = useState(false);
  const [fixa, setFixa] = useState(false);
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      onPointerLeave={(e) => e.pointerType === "mouse" && !fixa && setAberta(false)}
    >
      {resumo && <p>{resumo}</p>}
      <details className="group mt-1" open={aberta}>
        <summary
          onPointerEnter={(e) => e.pointerType === "mouse" && setAberta(true)}
          onClick={(e) => {
            e.preventDefault();
            if (fixa) {
              setFixa(false);
              setAberta(false);
            } else {
              setFixa(true);
              setAberta(true);
            }
          }}
          className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-bottle select-none hover:underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none [&::-webkit-details-marker]:hidden"
        >
          <CircleHelp className="size-3.5" aria-hidden /> {rotulo}
        </summary>
        <div className="mt-1.5 rounded-md border border-border bg-surface/60 p-2.5 leading-relaxed">{children}</div>
      </details>
    </div>
  );
}
