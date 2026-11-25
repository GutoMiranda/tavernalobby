"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/** Sino com o número de avisos não lidos; atualiza na hora quando chega um aviso (Supabase Realtime). */
export function SinoNotificacoes({ pessoaId, naoLidas }: { pessoaId: string; naoLidas: number }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`sino-${pessoaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_person_id=eq.${pessoaId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pessoaId, router]);

  const rotulo = naoLidas ? `Notificações: ${naoLidas} ${naoLidas === 1 ? "nova" : "novas"}` : "Notificações";
  return (
    <Link
      href="/notificacoes"
      aria-label={rotulo}
      title={rotulo}
      className="relative rounded-md p-2 text-parchment hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Bell className="size-5" aria-hidden />
      {naoLidas > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-alert px-1 text-xs font-bold text-white">
          {naoLidas > 9 ? "9+" : naoLidas}
        </span>
      )}
    </Link>
  );
}
