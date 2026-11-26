"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copia um texto para a área de transferência (ex.: link de convite para o WhatsApp). */
export function CopiarBotao({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copiar} aria-live="polite">
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? "Copiado!" : rotulo}
    </Button>
  );
}
