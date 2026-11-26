"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { criarItemArmazem } from "@/app/aventuras/armazem-actions";
import { AcaoForm } from "@/components/acao-form";
import { CamposItem } from "@/components/armazem/campos-item";
import { Gaveta } from "@/components/gaveta";
import { Button } from "@/components/ui/button";

/** Botão "+ Item" que abre a gaveta do formulário; fica aberta para cadastrar vários itens seguidos. */
export function GavetaNovoItem({ eventoId }: { eventoId: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setAberta(true)} aria-controls="gaveta-novo-item" aria-expanded={aberta}>
        <Plus aria-hidden /> Item
      </Button>
      <Gaveta id="gaveta-novo-item" titulo="Novo item na lista" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            O custo total é o preço por unidade × a quantidade. A gaveta continua aberta para você adicionar outro.
          </p>
          <AcaoForm action={criarItemArmazem} textoBotao="Adicionar à lista" limparAoConcluir>
            <input type="hidden" name="evento" value={eventoId} />
            <CamposItem prefixo="novo" />
          </AcaoForm>
        </div>
      </Gaveta>
    </>
  );
}
