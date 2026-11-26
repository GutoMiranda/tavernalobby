import { CalendarPlus, ChevronDown } from "lucide-react";

import { type EventoAgenda, linkGoogleAgenda } from "@/lib/agenda";

const ITEM =
  "block rounded-md px-3 py-2 text-sm hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none";

/** "Adicionar à agenda": um botão que abre Google Agenda (link) ou outras agendas (.ics, iPhone e Outlook). */
export function BotoesAgenda({
  evento,
  ics,
  rotulo = "Agenda",
}: {
  evento: EventoAgenda;
  /** Caminho do .ics no site. */
  ics: string;
  rotulo?: string;
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <CalendarPlus className="size-4" aria-hidden /> {rotulo}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute left-0 z-30 mt-1 w-56 rounded-lg border border-gold/40 bg-[#221a14] p-1 text-parchment shadow-xl">
        <a href={linkGoogleAgenda(evento)} target="_blank" rel="noopener noreferrer" className={ITEM}>
          Google Agenda <span className="sr-only">(abre em nova aba)</span>
        </a>
        <a href={ics} download className={ITEM}>
          iPhone, Outlook e outras (.ics)
        </a>
      </div>
    </details>
  );
}
