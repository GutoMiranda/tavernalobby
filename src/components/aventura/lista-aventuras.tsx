import { CartaAventura } from "@/components/aventura/carta-aventura";
import { Card } from "@/components/ui/card";
import type { Evento, ResumoDaCarta } from "@/lib/aventura-dados";
import { fotosDasFases } from "@/lib/cenas";
import { hojeEmSaoPaulo } from "@/lib/format";

const VAZIO: ResumoDaCarta = { confirmados: 0, bauCentavos: null, estalagem: null };

/** Quadro de missões: cada aventura é uma carta (pergaminho, medalhões, placa de pedra e cena da fase). */
export function ListaAventuras({ eventos, resumos }: { eventos: Evento[]; resumos: Map<string, ResumoDaCarta> }) {
  const fotos = fotosDasFases();
  const hoje = hojeEmSaoPaulo();
  if (eventos.length === 0) {
    return (
      <Card className="px-6 text-center text-muted-foreground">
        Nenhuma aventura no quadro de missões ainda. A taverna está quieta… por enquanto.
      </Card>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {eventos.map((e) => (
        <li key={e.id}>
          <CartaAventura evento={e} resumo={resumos.get(e.id) ?? VAZIO} foto={fotos[e.phase]} hoje={hoje} />
        </li>
      ))}
    </ul>
  );
}
