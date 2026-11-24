import { CalendarDays, Coins, House, Users, Wheat } from "lucide-react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const areas = [
  { icone: CalendarDays, termo: "Aventuras", comum: "encontros", texto: "Datas, votação e contagem regressiva." },
  { icone: House, termo: "Estalagens", comum: "hospedagens", texto: "Opções de casa, preço por pessoa e escolha final." },
  { icone: Users, termo: "Party", comum: "quem vai", texto: "Presença por pessoa, dias e família." },
  { icone: Coins, termo: "Baú", comum: "caixinha", texto: "Depósitos, saldo e quanto falta para a meta." },
  { icone: Wheat, termo: "Armazém", comum: "despensa", texto: "Comida e bebida, quem compra e quanto custa." },
];

// Página inicial temporária (Etapa 1): mostra o tema aplicado.
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-3 pt-4 text-center">
        <Logo size={88} />
        <h1 className="text-3xl font-bold text-wood">Taverna O Lobby</h1>
        <p className="max-w-md text-muted-foreground">
          A taverna onde a party se reúne antes da aventura. Aqui o grupo organiza cada encontro do
          começo ao fim.
        </p>
        <Badge variant="gold">Em construção · fase de testes</Badge>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Entrar na taverna</CardTitle>
          <CardDescription>
            Em breve: entrar com Google ou link mágico por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button disabled className="w-full sm:w-auto">
            Entrar com Google
          </Button>
          <Button variant="outline" disabled className="w-full sm:w-auto">
            Receber link por e-mail
          </Button>
        </CardContent>
      </Card>

      <section aria-labelledby="areas" className="flex flex-col gap-3">
        <h2 id="areas" className="text-xl font-semibold text-wood">
          O que vai ter na taverna
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {areas.map(({ icone: Icone, termo, comum, texto }) => (
            <li key={termo}>
              <Card className="h-full py-4">
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

      <p className="text-center text-sm text-muted-foreground">
        O baú está vazio. Nem um tostão furado.
      </p>
    </div>
  );
}
