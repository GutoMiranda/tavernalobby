"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { linkWhatsApp } from "@/lib/cobranca";

/** Compartilha o texto da rota pelo menu do celular; sem ele, abre o WhatsApp com o texto pronto. */
export function CompartilharRota({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: texto });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sem área de transferência: segue para o WhatsApp */
    }
    window.open(linkWhatsApp(texto), "_blank", "noopener,noreferrer");
  }
  return (
    <Button type="button" variant="outline" onClick={compartilhar} className="h-auto min-h-9 py-2 whitespace-normal">
      <Share2 aria-hidden /> {copiado ? "Rota copiada!" : "Compartilhar rota completa"}
    </Button>
  );
}
