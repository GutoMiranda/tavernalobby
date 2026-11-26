"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useActionState } from "react";

import { reagir } from "@/app/aventuras/actions";
import { Button } from "@/components/ui/button";
import type { Placar } from "@/lib/aventura";
import { cn } from "@/lib/utils";

/** Curtir / descurtir uma data ou estalagem. Tocar de novo desfaz. */
export function ReacaoBotoes({
  tipo,
  alvoId,
  eventoId,
  placar,
  rotulo,
  desativado,
}: {
  tipo: "data" | "estalagem";
  alvoId: string;
  eventoId: string;
  placar: Placar;
  rotulo: string;
  desativado?: boolean;
}) {
  const [estado, acao, enviando] = useActionState(reagir, {});

  const botao = (valor: 1 | -1) => {
    const ativo = placar.minha === valor;
    const Icone = valor === 1 ? ThumbsUp : ThumbsDown;
    const contagem = valor === 1 ? placar.curtidas : placar.descurtidas;
    return (
      <form action={acao}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="alvo" value={alvoId} />
        <input type="hidden" name="evento" value={eventoId} />
        <input type="hidden" name="valor" value={valor} />
        <input type="hidden" name="atual" value={placar.minha ?? 0} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={enviando || desativado}
          aria-pressed={ativo}
          aria-label={`${valor === 1 ? "Curtir" : "Descurtir"} ${rotulo} (${contagem})`}
          className={cn(
            "min-w-16",
            ativo &&
              valor === 1 &&
              "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            ativo && valor === -1 && "border-alert bg-alert text-white hover:bg-alert/90 hover:text-white",
          )}
        >
          <Icone aria-hidden />
          {contagem}
        </Button>
      </form>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {botao(1)}
      {botao(-1)}
      <span className="text-sm text-muted-foreground" aria-label={`Saldo ${placar.saldo}`}>
        saldo {placar.saldo > 0 ? `+${placar.saldo}` : placar.saldo}
      </span>
      {estado.erro && (
        <span role="alert" className="text-sm text-alert">
          {estado.erro}
        </span>
      )}
    </div>
  );
}
