import { DatasCandidatasCampos } from "@/components/aventura/datas-candidatas-campos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Evento } from "@/lib/aventura-dados";

function soData(valor: string | null | undefined) {
  if (!valor) return "";
  // Prazos são timestamptz; mostramos o dia em São Paulo.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(valor));
}

/** Campos do formulário de criar/editar aventura. Na criação, inclui as datas candidatas. */
export function CamposAventura({ evento }: { evento?: Evento }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Nome da aventura</Label>
        <Input
          id="nome"
          name="nome"
          required
          maxLength={120}
          defaultValue={evento?.name}
          placeholder="Ex.: Chácara de verão"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={2000}
          defaultValue={evento?.description ?? ""}
          className="rounded-md border border-input bg-field px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regiao">Região desejada</Label>
        <Input
          id="regiao"
          name="regiao"
          maxLength={120}
          defaultValue={evento?.region ?? ""}
          placeholder="Ex.: Serra da Mantiqueira"
        />
      </div>
      {!evento && <DatasCandidatasCampos />}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1.5 text-sm font-medium">Prazos das votações</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prazo_datas">Votação de datas até</Label>
          <Input id="prazo_datas" name="prazo_datas" type="date" defaultValue={soData(evento?.date_vote_deadline)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prazo_estalagens">Escolha da estalagem até</Label>
          <Input
            id="prazo_estalagens"
            name="prazo_estalagens"
            type="date"
            defaultValue={soData(evento?.accommodation_vote_deadline)}
          />
        </div>
      </fieldset>
    </>
  );
}
