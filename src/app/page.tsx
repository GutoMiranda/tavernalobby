import { Coins, Plus, ShieldCheck, Users, Wheat } from "lucide-react";
import Link from "next/link";

import { ListaAventuras } from "@/components/aventura/lista-aventuras";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento } from "@/lib/aventura-dados";

const emBreve = [
  { icone: Coins, termo: "Baú", comum: "caixinha", texto: "Depósitos, saldo e quanto falta para a meta." },
  { icone: Wheat, termo: "Armazém", comum: "despensa", texto: "Comida e bebida, quem compra e quanto custa." },
];

export default async function TavernaPage() {
  const { supabase, pessoa } = await exigirMembro();
  const { data: eventos } = await supabase
    .from("events")
    .select(COLUNAS_EVENTO)
    .not("phase", "in", "(concluida,cancelada)")
    .order("created_at", { ascending: false })
    .returns<Evento[]>();
  const primeiroNome = pessoa.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm text-muted-foreground">Taverna · página inicial</p>
        <h1 className="text-2xl font-bold text-wood">Salve, {primeiroNome}!</h1>
        <p className="text-muted-foreground">A party se reúne aqui antes de cada aventura.</p>
      </section>

      <section aria-labelledby="aventuras" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="aventuras" className="text-lg font-semibold text-wood">
            Aventuras em andamento
          </h2>
          {pessoa.is_admin && (
            <Button asChild size="sm">
              <Link href="/aventuras/nova">
                <Plus aria-hidden /> Nova aventura
              </Link>
            </Button>
          )}
        </div>
        <ListaAventuras eventos={eventos ?? []} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Atalho href="/familia" icone={Users} titulo="Minha família" texto="Cadastre quem vai com você nas aventuras." />
        {pessoa.is_admin && (
          <Atalho
            href="/admin/membros"
            icone={ShieldCheck}
            titulo="Membros e tags"
            texto="Aprove quem entrou e distribua as funções."
          />
        )}
      </div>

      <section aria-labelledby="em-breve" className="flex flex-col gap-3">
        <h2 id="em-breve" className="text-lg font-semibold text-wood">
          Em breve na taverna
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {emBreve.map(({ icone: Icone, termo, comum, texto }) => (
            <li key={termo}>
              <Card className="h-full py-4 opacity-90">
                <CardContent className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-wood p-2 text-gold" aria-hidden>
                    <Icone className="size-5" />
                  </span>
                  <div>
                    <p className="font-display font-semibold">
                      {termo} <span className="font-sans text-sm font-normal text-muted-foreground">· {comum}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{texto}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Atalho({
  href,
  icone: Icone,
  titulo,
  texto,
}: {
  href: string;
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <Link href={href} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="rounded-md bg-bottle p-2 text-white" aria-hidden>
            <Icone className="size-5" />
          </span>
          <div>
            <CardTitle>{titulo}</CardTitle>
            <CardDescription>{texto}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
