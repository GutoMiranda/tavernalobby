"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Opcao = { chave: string; nome: string; rotulo?: string };

/**
 * Escolha de origem e destino da rota. Troca o endereço sem recarregar a página e mostra "Calculando…"
 * enquanto o servidor busca a rota; o resultado anterior fica esmaecido até chegar o novo.
 */
export function SeletorRota({
  opcoes,
  de,
  para,
  children,
}: {
  opcoes: Opcao[];
  de?: string;
  para?: string;
  children: React.ReactNode;
}) {
  const [carregando, iniciar] = useTransition();
  const router = useRouter();
  const caminho = usePathname();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const q = new URLSearchParams({ de: String(dados.get("de")), para: String(dados.get("para")) });
    iniciar(() => router.replace(`${caminho}?${q}`, { scroll: false }));
  }

  const select = "h-10 w-full min-w-0 rounded-md border border-input bg-field px-3 text-base md:text-sm";
  return (
    <>
      <form onSubmit={enviar} className="grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="de">De</Label>
          <select id="de" name="de" defaultValue={de} className={select}>
            {opcoes.map((l) => (
              <option key={l.chave} value={l.chave}>
                {l.rotulo ?? l.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="para">Para</Label>
          <select id="para" name="para" defaultValue={para} className={select}>
            {opcoes.map((l) => (
              <option key={l.chave} value={l.chave}>
                {l.rotulo ?? l.nome}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={carregando}>
          {carregando ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Calculando…
            </>
          ) : (
            "Ver rota"
          )}
        </Button>
      </form>
      <div className="relative flex flex-col gap-4" aria-busy={carregando}>
        {carregando && (
          <p
            role="status"
            className="absolute inset-x-0 top-2 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-gold/60 bg-[#2a1f17] px-4 py-2 text-sm text-[#f3e6cf] shadow-lg"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden /> Calculando a rota…
          </p>
        )}
        <div className={cn("flex flex-col gap-4 transition-opacity", carregando && "pointer-events-none opacity-40")}>
          {children}
        </div>
      </div>
    </>
  );
}
