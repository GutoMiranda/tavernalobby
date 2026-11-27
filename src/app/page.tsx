import { CheckCircle2, ChevronRight, ListTodo } from "lucide-react";
import Link from "next/link";

import { ListaAventuras } from "@/components/aventura/lista-aventuras";
import { IconeCoroa, IconeD20, IconeEscudo } from "@/components/icones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { COLUNAS_EVENTO, type Evento, resumoDasAventuras } from "@/lib/aventura-dados";
import { sortearFrase } from "@/lib/frases";
import { pendenciasDaTaverna, semRepetir } from "@/lib/pendencias-dados";
import { entraNoSalao } from "@/lib/permissoes";

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
  const permissoes = await getPermissoes();
  const [resumos, todas] = await Promise.all([
    resumoDasAventuras(supabase, eventos ?? []),
    pendenciasDaTaverna(supabase, pessoa, eventos ?? [], permissoes.datas.editar).catch(() => []),
  ]);
  const minhas = semRepetir(todas);
  const primeiroNome = pessoa.name.split(" ")[0];
  const frase = sortearFrase();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-sm tracking-wide text-muted-foreground uppercase">Taverna · página inicial</p>
          <h1 className="text-3xl font-bold text-wood sm:text-4xl">Salve, {primeiroNome}!</h1>
        </div>
        <figure className="rounded-2xl border border-gold/25 bg-black/25 px-4 py-3">
          <blockquote className="font-display text-lg leading-snug text-parchment sm:text-xl">
            <span aria-hidden className="mr-1 text-gold">
              “
            </span>
            {frase.texto}
            <span aria-hidden className="ml-1 text-gold">
              ”
            </span>
          </blockquote>
          {frase.fonte && <figcaption className="mt-1 text-xs text-muted-foreground">— {frase.fonte}</figcaption>}
        </figure>
      </section>

      {(eventos ?? []).length > 0 && (
        <Card moldura={minhas.length ? "ouro" : "verde"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {minhas.length ? (
                <ListTodo className="size-5 text-gold" aria-hidden />
              ) : (
                <CheckCircle2 className="size-5 text-bottle" aria-hidden />
              )}
              {minhas.length ? "O que falta você fazer" : "Tudo em dia!"}
            </CardTitle>
            {!minhas.length && <CardDescription>Nenhuma pendência sua nas aventuras em andamento.</CardDescription>}
          </CardHeader>
          {minhas.length > 0 && (
            <CardContent>
              <ul className="flex flex-col gap-2">
                {minhas.map((p) => (
                  <li key={`${p.href}|${p.texto}`}>
                    <Link
                      href={p.href}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{p.texto}</span>
                        {!p.href.startsWith("/familia") && (
                          <span className="block text-xs text-muted-foreground">{p.aventura}</span>
                        )}
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-gold" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      <section aria-labelledby="aventuras" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="aventuras" className="flex items-center gap-2 text-2xl font-semibold text-wood">
            <IconeD20 className="size-7 text-gold" /> Aventuras em andamento
          </h2>
        </div>
        <ListaAventuras eventos={eventos ?? []} resumos={resumos} />
      </section>

      <div className="grade-taverna">
        <Atalho
          href="/familia"
          icone={IconeEscudo}
          titulo="Minha família"
          comum="núcleo"
          texto="Cadastre quem vai com você nas aventuras."
        />
        {entraNoSalao(permissoes, pessoa.is_admin) && (
          <Atalho
            href="/mestre"
            icone={IconeCoroa}
            titulo="Salão do Mestre"
            comum="administração"
            texto={
              pessoa.is_admin
                ? "Crie aventuras, aprove membros, dê tags e permissões, feche datas, custos e baú."
                : "As áreas que as suas tags deixam você cuidar."
            }
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
      <Card className="h-full text-center transition-transform duration-200 group-hover:-translate-y-1">
        <CardHeader className="flex flex-col items-center gap-3">
          <span
            className="grid size-20 place-items-center rounded-full border-2 border-gold/60 bg-[radial-gradient(circle,rgb(242_165_65/0.25),transparent_70%)] text-gold shadow-[0_0_24px_-6px_var(--gold)]"
            aria-hidden
          >
            <Icone className="size-11" />
          </span>
          <CardTitle className="text-2xl">
            {titulo} <span className="font-sans text-sm font-normal text-muted-foreground">· {comum}</span>
          </CardTitle>
          <p className="divisor-quest w-full text-xs" aria-hidden>
            ◆
          </p>
          <CardDescription className="text-base">{texto}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
