"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function urlDeRetorno(depois?: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (depois) url.searchParams.set("depois", depois);
  return url.toString();
}

/** Login com Google ou link mágico por e-mail (Supabase Auth). */
export function LoginForm({ depois }: { depois?: string }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado" | "erro">("livre");
  const [erro, setErro] = useState("");

  async function entrarComGoogle() {
    setErro("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeRetorno(depois) },
    });
    if (error) {
      setEstado("erro");
      setErro("Não foi possível abrir o login do Google. Tente de novo.");
    }
  }

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setErro("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlDeRetorno(depois) },
    });
    if (error) {
      setEstado("erro");
      setErro(
        error.status === 429
          ? "Muitos pedidos de link em pouco tempo. Espere alguns minutos e tente de novo."
          : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      );
    } else {
      setEstado("enviado");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Button type="button" size="lg" onClick={entrarComGoogle} className="w-full">
        <GoogleIcone />
        Entrar com Google
      </Button>

      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>

      {estado === "enviado" ? (
        <p role="status" className="rounded-md bg-bottle/10 p-3 text-sm text-bottle">
          Link enviado para <strong>{email}</strong>. Abra seu e-mail neste aparelho e toque no link para entrar.
        </p>
      ) : (
        <form onSubmit={enviarLink} className="flex flex-col gap-3">
          <Label htmlFor="email">Seu e-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={estado === "enviando"}>
            <Mail aria-hidden />
            {estado === "enviando" ? "Enviando…" : "Receber link de acesso por e-mail"}
          </Button>
        </form>
      )}

      {erro && (
        <p role="alert" className="text-sm font-medium text-alert">
          {erro}
        </p>
      )}
    </div>
  );
}

function GoogleIcone() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#fff" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" opacity=".85" />
      <path fill="#fff" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" opacity=".7" />
      <path fill="#fff" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" opacity=".55" />
    </svg>
  );
}
