"use client";

import { Wand2 } from "lucide-react";
import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { adicionarEstalagem, type DadosPreenchidos, editarEstalagem, lerAnuncio } from "@/app/aventuras/actions";
import { AcaoForm } from "@/components/acao-form";
import { CampoLugar } from "@/components/mapas/campo-lugar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const classeTextarea =
  "rounded-md border border-input bg-white px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";

export type EstalagemInicial = {
  id: string;
  name: string;
  url: string | null;
  preco: string;
  capacity: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  notes: string | null;
};

/**
 * Formulário de estalagem (nova ou edição), com "Preencher pelo link".
 * Tudo continua editável antes de salvar.
 */
export function FormEstalagem({ eventoId, inicial }: { eventoId: string; inicial?: EstalagemInicial }) {
  const router = useRouter();
  const [link, setLink] = useState(inicial?.url ?? "");
  const [nome, setNome] = useState(inicial?.name ?? "");
  const [preco, setPreco] = useState(inicial?.preco ?? "");
  const [capacidade, setCapacidade] = useState(inicial?.capacity ? String(inicial.capacity) : "");
  const [fotos, setFotos] = useState(inicial?.photos.join("\n") ?? "");
  const [notas, setNotas] = useState(inicial?.notes ?? "");
  const [lugar, setLugar] = useState<{ texto?: string; lat?: number; lng?: number; id?: string; versao: number }>({
    texto: inicial?.address ?? undefined,
    lat: inicial?.lat ?? undefined,
    lng: inicial?.lng ?? undefined,
    versao: 0,
  });
  const [resultado, setResultado] = useState<DadosPreenchidos | null>(null);
  const [lendo, iniciar] = useTransition();

  function preencher() {
    iniciar(async () => {
      const r = await lerAnuncio(link, nome);
      setResultado(r);
      if (r.erro) return;
      if (r.nome && !nome) setNome(r.nome);
      if (r.preco) setPreco(r.preco);
      if (r.capacidade) setCapacidade(String(r.capacidade));
      if (r.fotos?.length) setFotos(r.fotos.join("\n"));
      if (r.descricao && !notas) setNotas(r.descricao);
      if (r.endereco || r.lat !== undefined) {
        setLugar((l) => ({ texto: r.endereco, lat: r.lat, lng: r.lng, id: r.lugarId, versao: l.versao + 1 }));
      }
    });
  }

  function limpar() {
    setLink("");
    setNome("");
    setPreco("");
    setCapacidade("");
    setFotos("");
    setNotas("");
    setResultado(null);
    setLugar((l) => ({ versao: l.versao + 1 }));
  }

  const acao: typeof adicionarEstalagem = async (estado, dados) => {
    if (inicial) {
      const r = await editarEstalagem(estado, dados);
      if (r.ok) router.push(`/aventuras/${eventoId}/estalagens`);
      return r;
    }
    const r = await adicionarEstalagem(estado, dados);
    if (r.ok) limpar();
    return r;
  };

  return (
    <AcaoForm action={acao} textoBotao={inicial ? "Salvar alterações" : "Adicionar estalagem"}>
      <input type="hidden" name="evento" value={eventoId} />
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-link">Link do anúncio</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="est-link"
            name="link"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={preencher} disabled={lendo || !link.trim()}>
            <Wand2 aria-hidden />
            {lendo ? "Lendo o anúncio…" : "Preencher pelo link"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tenta trazer nome, fotos, descrição, preço e localização. Se o anúncio não tiver o endereço, procura pelo nome
          no Google.
        </p>
        {resultado && (
          <p role="status" className={`text-sm ${resultado.erro ? "font-medium text-alert" : "text-bottle"}`}>
            {resultado.erro ?? resultado.aviso}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-nome">Nome</Label>
        <Input
          id="est-nome"
          name="nome"
          required
          maxLength={120}
          placeholder="Ex.: Chácara Recanto do Sol"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="est-preco">Preço total da estadia (R$)</Label>
          <Input
            id="est-preco"
            name="preco"
            required
            inputMode="decimal"
            placeholder="3.000,00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="est-capacidade">Capacidade (pessoas)</Label>
          <Input
            id="est-capacidade"
            name="capacidade"
            type="number"
            min={1}
            inputMode="numeric"
            value={capacidade}
            onChange={(e) => setCapacidade(e.target.value)}
          />
        </div>
      </div>
      <CampoLugar
        key={lugar.versao}
        id="est-endereco"
        rotulo="Endereço"
        tipo="endereco"
        valorInicial={lugar.texto}
        latInicial={lugar.lat}
        lngInicial={lugar.lng}
        idInicial={lugar.id}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-fotos">Links de fotos (um por linha, opcional)</Label>
        <textarea
          id="est-fotos"
          name="fotos"
          rows={2}
          className={classeTextarea}
          placeholder="https://…"
          value={fotos}
          onChange={(e) => setFotos(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-notas">Observações</Label>
        <textarea
          id="est-notas"
          name="notas"
          rows={3}
          maxLength={2000}
          className={classeTextarea}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
    </AcaoForm>
  );
}
