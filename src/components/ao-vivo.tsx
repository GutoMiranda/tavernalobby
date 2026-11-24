"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Tempo real: escuta mudanças nas tabelas (Supabase Realtime) e recarrega os dados da página.
 * O RLS vale também aqui: cada pessoa só recebe mudanças do que pode ver.
 */
export function AoVivo({ tabelas, canal }: { tabelas: string[]; canal: string }) {
  const router = useRouter();
  const lista = tabelas.join(",");

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };

    let ch = supabase.channel(canal);
    for (const table of lista.split(",")) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, atualizar);
    }
    ch.subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [canal, router, lista]);

  return null;
}
