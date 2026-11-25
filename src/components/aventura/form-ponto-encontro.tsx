import { AcaoForm } from "@/components/acao-form";
import { CampoLugar } from "@/components/mapas/campo-lugar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarPontoEncontro } from "@/app/aventuras/actions";
import type { Evento } from "@/lib/aventura-dados";

function paraCampoDataHora(iso: string | null) {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}`;
}

/** Formulário do ponto de encontro (Salão do Mestre, aba Aventura). */
export function FormPontoEncontro({ id, evento }: { id: string; evento: Evento }) {
  return (
    <details className="rounded-md border border-border p-3" open={!evento.meeting_address}>
      <summary className="cursor-pointer font-medium">
        {evento.meeting_address ? "Alterar ponto de encontro" : "Definir ponto de encontro"}
      </summary>
      <div className="mt-3">
        <AcaoForm action={salvarPontoEncontro} textoBotao="Salvar ponto de encontro">
          <input type="hidden" name="evento" value={id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enc-nome">Nome do lugar</Label>
            <Input
              id="enc-nome"
              name="nome"
              maxLength={120}
              defaultValue={evento.meeting_name ?? ""}
              placeholder="Ex.: Posto Graal da Bandeirantes"
            />
          </div>
          <CampoLugar
            id="enc-lugar"
            rotulo="Endereço"
            tipo="endereco"
            valorInicial={evento.meeting_address}
            latInicial={evento.meeting_lat ?? undefined}
            lngInicial={evento.meeting_lng ?? undefined}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enc-quando">Data e hora</Label>
            <Input
              id="enc-quando"
              name="quando"
              type="datetime-local"
              defaultValue={paraCampoDataHora(evento.meeting_at)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enc-notas">Observações</Label>
            <Input
              id="enc-notas"
              name="notas"
              maxLength={1000}
              defaultValue={evento.meeting_notes ?? ""}
              placeholder="Ex.: encontrar no estacionamento"
            />
          </div>
        </AcaoForm>
      </div>
    </details>
  );
}
