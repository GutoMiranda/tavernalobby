import { Plus } from "lucide-react";
import Link from "next/link";

import { ListaAventuras } from "@/components/aventura/lista-aventuras";
import { IconeCoroa, IconeD20, IconeEscudo } from "@/components/icones";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";
import { sortearFrase } from "@/lib/frases";

// Nova frase a cada visita.
export const dynamic = "force-dynamic";

export default async function TavernaPage() {
  const { supabase, pessoa } = await exigirMembro();
  const { data: eventos } = await supabase
    .from("events")
    .select(COLUNAS_EVENTO)
    .not("phase", "in", "(concluida,cancelada)")
    .order("created_at", { ascending: false })
    .returns<Evento[]>();
  const primeiroNome = pessoa.name.split(" ")[0];
  const frase = sortearFrase();

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#5a4128] bg-[radial-gradient(ellipse_at_20%_0%,rgb(242_165_65/0.18),transparent_60%),linear-gradient(180deg,#2a1f17,#1d1611)] p-6 shadow-[var(--brilho-vela)] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Logo size={96} className="drop-shadow-[0_0_24px_rgb(242_165_65/0.45)]" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm tracking-wide text-muted-foreground uppercase">Taverna · página inicial</p>
            <h1 className="text-4xl font-bold text-wood sm:text-5xl">Salve, {primeiroNome}!</h1>
            <p className="text-muted-foreground">A party se reúne aqui antes de cada aventura.</p>
          </div>
        </div>
        <figure className="mt-6 rounded-2xl border border-gold/25 bg-black/25 p-5">
          <blockquote className="font-display text-2xl leading-snug text-parchment sm:text-3xl">
            <span aria-hidden className="mr-1 text-gold">
              “
            </span>
            {frase.texto}
            <span aria-hidden className="ml-1 text-gold">
              ”
            </span>
          </blockquote>
          {frase.fonte && <figcaption className="mt-2 text-sm text-muted-foreground">— {frase.fonte}</figcaption>}
        </figure>
      </section>

      <section aria-labelledby="aventuras" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="aventuras" className="flex items-center gap-2 text-2xl font-semibold text-wood">
            <IconeD20 className="size-7 text-gold" /> Aventuras em andamento
          </h2>
          {pessoa.is_admin && (
            <Button asChild className="brilho-vela">
              <Link href="/aventuras/nova">
                <Plus aria-hidden /> Nova aventura
              </Link>
            </Button>
          )}
        </div>
        <ListaAventuras eventos={eventos ?? []} />
      </section>

      <div className="grade-taverna">
        <Atalho
          href="/familia"
          icone={IconeEscudo}
          titulo="Minha família"
          comum="núcleo"
          texto="Cadastre quem vai com você nas aventuras."
        />
        {pessoa.is_admin && (
          <Atalho
            href="/admin/membros"
            icone={IconeCoroa}
            titulo="Membros e tags"
            comum="admin"
            texto="Aprove quem entrou e distribua as funções."
          />
        )}
      </div>
    </div>
  );
}

function Atalho({
  href,
  icone: Icone,
  titulo,
  comum,
  texto,
}: {
  href: string;
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  comum: string;
  texto: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Card className="h-full transition-transform duration-200 group-hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center gap-4">
          <span className="rounded-xl border border-gold/30 bg-surface p-3 text-gold" aria-hidden>
            <Icone className="size-9" />
          </span>
          <div>
            <CardTitle>
              {titulo} <span className="font-sans text-sm font-normal text-muted-foreground">· {comum}</span>
            </CardTitle>
            <CardDescription>{texto}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
