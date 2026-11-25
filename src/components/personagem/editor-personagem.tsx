"use client";

import { useState } from "react";

import { AcaoForm } from "@/components/acao-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstadoAcao } from "@/lib/erros";
import { AVATARES, CORES_AVATAR, IDS_AVATARES, IDS_CORES, type Papel } from "@/lib/personagem";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { NomeEnfeitado } from "./nome-enfeitado";

type Props = {
  pessoaId: string;
  nome: string;
  papel: Papel;
  inicial: { avatar: string | null; cor: string | null; epiteto: string | null };
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
};

/** Escolha do personagem com prévia ao vivo: emblema, cor e epíteto. */
export function EditorPersonagem({ pessoaId, nome, papel, inicial, acao }: Props) {
  const [avatar, setAvatar] = useState(inicial.avatar ?? "");
  const [cor, setCor] = useState(inicial.cor ?? "");
  const [epiteto, setEpiteto] = useState(inicial.epiteto ?? "");

  return (
    <AcaoForm action={acao} textoBotao="Salvar personagem">
      <input type="hidden" name="pessoa" value={pessoaId} />
      <input type="hidden" name="avatar" value={avatar} />
      <input type="hidden" name="cor" value={cor} />

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gold/30 bg-black/20 p-4 text-center sm:flex-row sm:text-left">
        <Avatar nome={nome} avatar={avatar || null} cor={cor || null} papel={papel} tamanho={84} />
        <NomeEnfeitado
          nome={nome}
          epiteto={epiteto.trim() || null}
          papel={papel}
          mostrarTitulo
          className="text-xl [&_.truncate]:whitespace-normal"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Emblema</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Emblema do personagem">
          <BotaoEscolha ativo={!avatar} onClick={() => setAvatar("")} rotulo="Iniciais">
            <Avatar nome={nome} cor={cor || null} tamanho={44} />
          </BotaoEscolha>
          {IDS_AVATARES.map((a) => (
            <BotaoEscolha key={a} ativo={avatar === a} onClick={() => setAvatar(a)} rotulo={AVATARES[a]}>
              <Avatar nome={nome} avatar={a} cor={cor || null} tamanho={44} />
            </BotaoEscolha>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Cor</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do personagem">
          {IDS_CORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cor === c}
              aria-label={CORES_AVATAR[c].nome}
              title={CORES_AVATAR[c].nome}
              onClick={() => setCor(c)}
              className={cn(
                "size-10 rounded-full border-2 transition-transform",
                cor === c ? "scale-110 border-gold shadow-[0_0_12px_-2px_var(--gold)]" : "border-border",
              )}
              style={{ background: CORES_AVATAR[c].cor }}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="epiteto">Epíteto (apelido épico, opcional)</Label>
        <Input
          id="epiteto"
          name="epiteto"
          maxLength={40}
          placeholder="ex.: o Bardo do Churrasco"
          value={epiteto}
          onChange={(e) => setEpiteto(e.target.value)}
        />
      </div>
    </AcaoForm>
  );
}

function BotaoEscolha({
  ativo,
  onClick,
  rotulo,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-xs transition-colors",
        ativo ? "border-gold bg-gold/15 text-wood" : "border-transparent hover:border-gold/40",
      )}
    >
      {children}
      <span className="truncate">{rotulo}</span>
    </button>
  );
}
