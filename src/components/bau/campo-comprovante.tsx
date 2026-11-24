"use client";

import { Loader2, Paperclip } from "lucide-react";
import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const TIPOS = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

/**
 * Envia o comprovante direto para o armazenamento privado (pasta do próprio usuário)
 * e guarda o caminho num campo escondido "comprovante" para o formulário.
 */
export function CampoComprovante({ userId }: { userId: string }) {
  const id = useId();
  const [caminho, setCaminho] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [mensagem, setMensagem] = useState("");

  async function enviar(arquivo: File | undefined) {
    setCaminho("");
    if (!arquivo) return setEstado("");
    if (arquivo.size > 10 * 1024 * 1024) {
      setEstado("erro");
      return setMensagem("Arquivo maior que 10 MB.");
    }
    setEstado("enviando");
    const nome = arquivo.name
      .normalize("NFD")
      .replace(/[^A-Za-z0-9.\-_]/g, "_")
      .slice(-60);
    const destino = `${userId}/${Date.now()}-${nome}`;
    const { error } = await createClient().storage.from("comprovantes").upload(destino, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    });
    if (error) {
      setEstado("erro");
      setMensagem("Não consegui enviar o arquivo. Tente de novo.");
      return;
    }
    setCaminho(destino);
    setEstado("ok");
    setMensagem(`${arquivo.name} anexado.`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Paperclip className="size-4" aria-hidden /> Comprovante (opcional: foto ou PDF, até 10 MB)
      </Label>
      <input
        id={id}
        type="file"
        accept={TIPOS}
        onChange={(e) => enviar(e.target.files?.[0])}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-white file:px-3 file:py-1.5"
      />
      <input type="hidden" name="comprovante" value={caminho} />
      <p role="status" aria-live="polite" className="text-sm">
        {estado === "enviando" && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Enviando…
          </span>
        )}
        {estado === "ok" && <span className="text-bottle">{mensagem}</span>}
        {estado === "erro" && <span className="font-medium text-alert">{mensagem}</span>}
      </p>
    </div>
  );
}
