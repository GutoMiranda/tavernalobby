import Link from "next/link";

import { CENA_DA_FASE, CenaQuest } from "@/components/cena-quest";
import { FASE_INFO } from "@/lib/aventura";
import type { Evento, ResumoDaCarta } from "@/lib/aventura-dados";
import { diasEntre, formatarCentavos, formatarPeriodo, hojeEmSaoPaulo } from "@/lib/format";

function Medalhao({ valor, rotulo, lado }: { valor: string; rotulo: string; lado: "esq" | "dir" }) {
  return (
    <div className={`flex items-center gap-1.5 ${lado === "dir" ? "flex-row-reverse text-right" : ""}`}>
      <span className="carta-medalhao" aria-hidden>
        <span>
          <span>{valor}</span>
        </span>
      </span>
      <span className="font-display text-[0.7rem] leading-tight font-bold tracking-wide text-[#7a4a1c] uppercase">
        {rotulo}
      </span>
    </div>
  );
}

/**
 * Carta da aventura no quadro de missões: medalhões com os dias que faltam e os confirmados, nome,
 * placa de pedra com data e estalagem, cena da fase e rodapé com a fase e o saldo do baú.
 */
export function CartaAventura({
  evento: e,
  resumo,
  foto,
  hoje = hojeEmSaoPaulo(),
}: {
  evento: Evento;
  resumo: ResumoDaCarta;
  foto?: string | null;
  hoje?: string;
}) {
  const dias = e.start_date ? diasEntre(hoje, e.start_date) : null;
  const encerrada = e.phase === "concluida" || e.phase === "cancelada";
  const valorDias = dias == null ? "?" : dias < 0 ? "✓" : dias > 999 ? "999+" : String(dias);
  const rotuloDias =
    dias == null
      ? "data a definir"
      : dias < 0
        ? "já foi"
        : dias === 0
          ? "é hoje!"
          : dias === 1
            ? "dia para partir"
            : "dias para partir";
  const quando = e.start_date && e.end_date ? formatarPeriodo(e.start_date, e.end_date) : "Data a definir";
  const onde = resumo.estalagem ?? e.region ?? "Estalagem a definir";
  const descricao = [
    e.name,
    FASE_INFO[e.phase].nome,
    dias != null && dias >= 0 ? `faltam ${dias} dias` : null,
    `${resumo.confirmados} confirmados`,
    quando,
    onde,
    resumo.bauCentavos != null ? `${formatarCentavos(resumo.bauCentavos)} no baú` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/aventuras/${e.id}`}
      aria-label={descricao}
      className="group block h-full rounded-[1.1rem] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <article
        className="carta transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]"
        data-encerrada={encerrada ? "" : undefined}
      >
        <div className="carta-miolo">
          <div className="carta-topo">
            <div className="flex items-start justify-between gap-2">
              <Medalhao valor={valorDias} rotulo={rotuloDias} lado="esq" />
              <Medalhao valor={String(resumo.confirmados)} rotulo="confirmados" lado="dir" />
            </div>
            <h3 className="-mt-1 px-2 text-center font-display text-[1.65rem] leading-tight font-bold text-[#4a2a0e] [text-shadow:0_1px_0_rgb(255_244_214/0.7)]">
              {e.name}
            </h3>
          </div>

          <div className="carta-placa mt-2 text-center">
            <p className="font-display text-lg leading-snug font-bold">{quando}</p>
            <p className="text-sm leading-snug text-[#3a2a1a]">{onde}</p>
          </div>

          <div className="carta-ilustracao">
            <span className="absolute inset-0 block">
              <CenaQuest cena={CENA_DA_FASE[e.phase]} idBase={`carta-${e.id}`} foto={foto} />
            </span>
          </div>

          <div className="carta-rodape">
            <span className={e.phase === "cancelada" ? "text-[#9b2c17]" : undefined}>{FASE_INFO[e.phase].nome}</span>
            <span>{resumo.bauCentavos != null ? `${formatarCentavos(resumo.bauCentavos)} no baú` : "Baú fechado"}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
