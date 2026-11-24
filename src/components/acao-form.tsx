"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { EstadoAcao } from "@/lib/erros";
import { cn } from "@/lib/utils";

type Props = {
  action: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  children?: React.ReactNode;
  textoBotao: string;
  textoEnviando?: string;
  variante?: React.ComponentProps<typeof Button>["variant"];
  tamanho?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  limparAoConcluir?: boolean;
};

/** Formulário de server action com botão de envio e mensagem de sucesso/erro acessível. */
export function AcaoForm({
  action,
  children,
  textoBotao,
  textoEnviando = "Salvando…",
  variante,
  tamanho,
  className,
  limparAoConcluir = false,
}: Props) {
  const [estado, executar] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (limparAoConcluir && estado.ok) formRef.current?.reset();
  }, [estado, limparAoConcluir]);

  return (
    <form ref={formRef} action={executar} className={cn("flex flex-col gap-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <BotaoEnviar texto={textoBotao} textoEnviando={textoEnviando} variante={variante} tamanho={tamanho} />
        <p role="status" aria-live="polite" className="text-sm">
          {estado.ok && <span className="text-bottle">{estado.ok}</span>}
          {estado.erro && <span className="font-medium text-alert">{estado.erro}</span>}
        </p>
      </div>
    </form>
  );
}

function BotaoEnviar({
  texto,
  textoEnviando,
  variante,
  tamanho,
}: {
  texto: string;
  textoEnviando: string;
  variante?: Props["variante"];
  tamanho?: Props["tamanho"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variante} size={tamanho}>
      {pending ? textoEnviando : texto}
    </Button>
  );
}
