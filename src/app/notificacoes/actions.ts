"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirMembro } from "@/lib/auth";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { linkSeguro } from "@/lib/notificacoes";

export async function abrirNotificacao(d: FormData): Promise<void> {
  const { supabase } = await exigirMembro();
  const id = String(d.get("id") ?? "");
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null)
    .select("link")
    .maybeSingle();
  revalidatePath("/", "layout");
  redirect(linkSeguro(data?.link ?? (String(d.get("link") ?? "") || null)));
}

export async function marcarTodasLidas(_: EstadoAcao): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return { erro: mensagemErro(error) };
  revalidatePath("/", "layout");
  return { ok: "Tudo marcado como lido." };
}
