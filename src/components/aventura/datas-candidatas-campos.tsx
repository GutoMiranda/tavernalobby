"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Linhas de datas candidatas (início, fim e motivo) no formulário de nova aventura. */
export function DatasCandidatasCampos() {
  const [linhas, setLinhas] = useState([0]);
  const [proximo, setProximo] = useState(1);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Datas candidatas</legend>
      <p className="text-sm text-muted-foreground">
        Cada opção vira uma data para a party curtir ou descurtir na aba Datas. Dá para adicionar mais depois.
      </p>
      {linhas.map((id, i) => (
        <div key={id} className="flex flex-col gap-2 rounded-lg border border-border bg-white/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Opção {i + 1}</span>
            {linhas.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinhas((l) => l.filter((x) => x !== id))}
                aria-label={`Remover opção ${i + 1}`}
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`d-inicio-${id}`}>Início</Label>
              <Input id={`d-inicio-${id}`} name="data_inicio" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`d-fim-${id}`}>Fim</Label>
              <Input id={`d-fim-${id}`} name="data_fim" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`d-motivo-${id}`}>Motivo (opcional)</Label>
            <Input id={`d-motivo-${id}`} name="data_motivo" maxLength={200} placeholder="Ex.: feriado de Carnaval" />
          </div>
        </div>
      ))}
      {linhas.length < 8 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            setLinhas((l) => [...l, proximo]);
            setProximo((p) => p + 1);
          }}
        >
          <Plus aria-hidden /> Adicionar outra data
        </Button>
      )}
    </fieldset>
  );
}
