"use client";

import { useActionState, useState } from "react";

import { AcaoForm } from "@/components/acao-form";
import { CopiarBotao } from "@/components/copiar-botao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { editarPessoa, gerarConviteDependente, removerDependente } from "./actions";

export type PessoaDaFamilia = {
  id: string;
  name: string;
  relationship: string | null;
  is_child: boolean;
  tem_login: boolean;
  sou_eu: boolean;
};

export function PessoaItem({ pessoa }: { pessoa: PessoaDaFamilia }) {
  const [editando, setEditando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [convite, gerarConvite, gerando] = useActionState(gerarConviteDependente, {});
  const dependente = !pessoa.tem_login;
  const prefixo = `p-${pessoa.id}`;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-white/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{pessoa.name}</p>
        {pessoa.relationship && <span className="text-sm text-muted-foreground">· {pessoa.relationship}</span>}
        {pessoa.sou_eu && <Badge variant="secondary">Você</Badge>}
        {pessoa.is_child && <Badge variant="gold">Criança</Badge>}
        {pessoa.tem_login && !pessoa.sou_eu && <Badge variant="outline">Tem login</Badge>}
      </div>

      {editando ? (
        <AcaoForm action={editarPessoa} textoBotao="Salvar">
          <input type="hidden" name="id" value={pessoa.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${prefixo}-nome`}>Nome</Label>
              <Input id={`${prefixo}-nome`} name="nome" defaultValue={pessoa.name} required maxLength={80} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${prefixo}-parentesco`}>Parentesco</Label>
              <Input
                id={`${prefixo}-parentesco`}
                name="parentesco"
                defaultValue={pessoa.relationship ?? ""}
                maxLength={40}
                placeholder="cônjuge, filho, mãe…"
              />
            </div>
          </div>
          {dependente && (
            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="pode_ser_crianca" value="1" />
              <input type="checkbox" name="crianca" defaultChecked={pessoa.is_child} className="size-4 accent-bottle" />
              É criança (não entra no rateio de custos)
            </label>
          )}
        </AcaoForm>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditando((v) => !v)}>
          {editando ? "Fechar edição" : "Editar"}
        </Button>

        {dependente && !pessoa.is_child && (
          <form action={gerarConvite}>
            <input type="hidden" name="id" value={pessoa.id} />
            <Button type="submit" variant="outline" size="sm" disabled={gerando}>
              {gerando ? "Gerando…" : "Convidar para ter login próprio"}
            </Button>
          </form>
        )}

        {dependente &&
          (confirmarRemocao ? (
            <AcaoForm action={removerDependente} textoBotao={`Sim, remover ${pessoa.name}`} variante="destructive" tamanho="sm" textoEnviando="Removendo…">
              <input type="hidden" name="id" value={pessoa.id} />
            </AcaoForm>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="text-alert" onClick={() => setConfirmarRemocao(true)}>
              Remover
            </Button>
          ))}
      </div>

      {convite.erro && (
        <p role="alert" className="text-sm font-medium text-alert">
          {convite.erro}
        </p>
      )}
      {convite.link && (
        <div className="flex flex-col gap-2 rounded-md bg-bottle/10 p-3 text-sm" role="status">
          <p>{convite.ok} Envie este link para {pessoa.name}:</p>
          <code className="break-all">{convite.link}</code>
          <div>
            <CopiarBotao texto={convite.link} rotulo="Copiar link" />
          </div>
        </div>
      )}
    </li>
  );
}
