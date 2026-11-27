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
  const encerrada = (e: Evento) => e.phase === "concluida" || e.phase === "cancelada";
  const ativas = eventos.filter((e) => !encerrada(e));
  const jaForam = eventos.filter(encerrada);
  // No celular, só a primeira aventura em andamento mostra a cena; as outras ficam compactas.
  const carta = (e: Evento, i: number) => (
    <li key={e.id}>
      <CartaAventura
        evento={e}
        resumo={resumos.get(e.id) ?? VAZIO}
        foto={fotos[e.phase]}
        hoje={hoje}
        compacta={i > 0 || encerrada(e)}
      />
    </li>
  );
  return (
    <div className="flex flex-col gap-6">
      {ativas.length > 0 && <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{ativas.map(carta)}</ul>}
      {jaForam.length > 0 && (
        <details open={ativas.length === 0} className="group">
          <summary className="cursor-pointer font-display text-lg font-semibold text-wood">
            Já foram ({jaForam.length})
          </summary>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{jaForam.map(carta)}</ul>
        </details>
      )}
    </div>
  );
}
