"use client";

import { Camera, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { AcaoForm } from "@/components/acao-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstadoAcao } from "@/lib/erros";
import {
  CORES_AVATAR,
  IDS_AVATARES,
  IDS_CORES,
  nomeDoEmblema,
  type Papel,
  recorteQuadrado,
  SEXOS,
} from "@/lib/personagem";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { NomeEnfeitado } from "./nome-enfeitado";

type Props = {
  pessoaId: string;
  nome: string;
  papel: Papel;
  /** Login de quem está editando (a foto vai para a pasta dele no armazenamento). */
  userId: string;
  inicial: {
    avatar: string | null;
    cor: string | null;
    epiteto: string | null;
    sexo: string | null;
    fotoCaminho: string | null;
    fotoUrl: string | null;
  };
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
};

/** Foto do avatar: recorte quadrado central, 256×256, em WebP (fica leve, por volta de 20 KB). */
async function prepararFoto(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const { x, y, lado } = recorteQuadrado(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, x, y, lado, lado, 0, 0, 256, 256);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("webp");
  return blob;
}

/** Escolha do personagem com prévia ao vivo: foto (opcional), emblema, cor e epíteto. */
export function EditorPersonagem({ pessoaId, nome, papel, userId, inicial, acao }: Props) {
  const [avatar, setAvatar] = useState(inicial.avatar ?? "");
  const [cor, setCor] = useState(inicial.cor ?? "");
  const [epiteto, setEpiteto] = useState(inicial.epiteto ?? "");
  const [sexo, setSexo] = useState(inicial.sexo ?? "");
  const [fotoCaminho, setFotoCaminho] = useState(inicial.fotoCaminho ?? "");
  const [fotoUrl, setFotoUrl] = useState(inicial.fotoUrl);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroFoto(null);
    setEnviandoFoto(true);
    try {
      const blob = await prepararFoto(arquivo);
      const caminho = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from("avatares")
        .upload(caminho, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      setFotoCaminho(caminho);
      setFotoUrl(URL.createObjectURL(blob));
    } catch {
      setErroFoto("Não foi possível usar essa imagem. Tente uma foto JPG ou PNG.");
    } finally {
      setEnviandoFoto(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  return (
    <AcaoForm action={acao} textoBotao="Salvar personagem">
      <input type="hidden" name="pessoa" value={pessoaId} />
      <input type="hidden" name="avatar" value={avatar} />
      <input type="hidden" name="cor" value={cor} />
      <input type="hidden" name="foto" value={fotoCaminho} />
      <input type="hidden" name="sexo" value={sexo} />

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gold/30 bg-black/20 p-4 text-center sm:flex-row sm:text-left">
        <Avatar
          nome={nome}
          avatar={avatar || null}
          foto={fotoCaminho ? fotoUrl : null}
          cor={cor || null}
          papel={papel}
          tamanho={84}
        />
        <NomeEnfeitado
          nome={nome}
          epiteto={epiteto.trim() || null}
          papel={papel}
          sexo={sexo || null}
          mostrarTitulo
          className="text-xl [&_.truncate]:whitespace-normal"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-medium">Foto (opcional)</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={arquivoRef}
            id={`foto-${pessoaId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => escolherFoto(e.target.files?.[0])}
          />
          <label
            htmlFor={`foto-${pessoaId}`}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-field px-3 py-2 text-sm hover:border-gold focus-within:ring-2 focus-within:ring-gold"
          >
            <Camera className="size-4" aria-hidden />{" "}
            {enviandoFoto ? "Enviando…" : fotoCaminho ? "Trocar foto" : "Enviar foto"}
          </label>
          {fotoCaminho && (
            <button
              type="button"
              onClick={() => setFotoCaminho("")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-alert"
            >
              <Trash2 className="size-4" aria-hidden /> Usar emblema no lugar da foto
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          A foto é cortada no meio em quadrado e só membros aprovados veem. Sem foto, vale o emblema abaixo.
        </p>
        {erroFoto && (
          <p role="alert" className="text-sm text-alert">
            {erroFoto}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Sexo do personagem</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sexo do personagem">
          {(
            [
              ["m", SEXOS.m],
              ["f", SEXOS.f],
              ["", "Prefiro não dizer"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor || "nenhum"}
              type="button"
              role="radio"
              aria-checked={sexo === valor}
              onClick={() => setSexo(valor)}
              className={cn(
                "rounded-full border-2 px-3 py-1.5 text-sm transition-colors",
                sexo === valor ? "border-gold bg-gold/15 text-wood" : "border-border hover:border-gold/40",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Muda o nome do emblema e do título (ex.: Mago ou Maga).</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Emblema</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Emblema do personagem">
          <BotaoEscolha ativo={!avatar} onClick={() => setAvatar("")} rotulo="Iniciais">
            <Avatar nome={nome} cor={cor || null} tamanho={44} />
          </BotaoEscolha>
          {IDS_AVATARES.map((a) => (
            <BotaoEscolha key={a} ativo={avatar === a} onClick={() => setAvatar(a)} rotulo={nomeDoEmblema(a, sexo)}>
              <Avatar nome={nome} avatar={a} cor={cor || null} sexo={sexo || null} tamanho={44} />
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
