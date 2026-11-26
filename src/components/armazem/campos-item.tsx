"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { CATEGORIAS_ARMAZEM, custoDoItem, UNIDADES_ARMAZEM } from "@/lib/finance/armazem";
import { formatarCentavos } from "@/lib/format";

export const SELECT = "h-10 w-full rounded-md border border-input bg-field px-3 text-base md:text-sm";

export type ValoresItem = {
  name: string;
  category: string | null;
  unit: string | null;
  unit_price_cents: number | null;
  quantity: number | null;
  quantity_per_person: number | null;
  is_alcoholic: boolean;
};

const campoNum = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));
const lerNum = (t: string) => {
  const n = Number(t.replace(",", "."));
  return t.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/** Campos de um item do Armazém, com o custo total calculado na hora (preço × quantidade). */
export function CamposItem({ prefixo, item }: { prefixo: string; item?: ValoresItem }) {
  const [unidade, setUnidade] = useState(item?.unit ?? "un");
  const [preco, setPreco] = useState(
    item?.unit_price_cents != null ? (item.unit_price_cents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [quantidade, setQuantidade] = useState(campoNum(item?.quantity));
  const total = custoDoItem(reaisParaCentavos(preco), lerNum(quantidade));
  const raiz = useRef<HTMLDivElement>(null);

  // Quando o formulário é limpo depois de salvar, volta os campos controlados ao início.
  useEffect(() => {
    const form = raiz.current?.closest("form");
    if (!form) return;
    const limpar = () => {
      setUnidade(item?.unit ?? "un");
      setPreco("");
      setQuantidade("");
    };
    form.addEventListener("reset", limpar);
    return () => form.removeEventListener("reset", limpar);
  }, [item?.unit]);

  return (
    <div ref={raiz} className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${prefixo}-nome`}>Item</Label>
        <Input
          id={`${prefixo}-nome`}
          name="nome"
          required
          maxLength={120}
          defaultValue={item?.name}
          placeholder="Ex.: Picanha"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-cat`}>Categoria</Label>
        <select id={`${prefixo}-cat`} name="categoria" className={SELECT} defaultValue={item?.category ?? ""}>
          <option value="">Sem categoria</option>
          {CATEGORIAS_ARMAZEM.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-un`}>Unidade</Label>
        <select
          id={`${prefixo}-un`}
          name="unidade"
          className={SELECT}
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
        >
          {UNIDADES_ARMAZEM.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-preco`}>Preço por {unidade} (R$)</Label>
        <Input
          id={`${prefixo}-preco`}
          name="preco"
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="Ex.: 59,90"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-qt`}>Quantidade ({unidade})</Label>
        <Input
          id={`${prefixo}-qt`}
          name="quantidade"
          inputMode="decimal"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="Ex.: 8,5"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-pp`}>Consumo por pessoa por dia (opcional)</Label>
        <Input
          id={`${prefixo}-pp`}
          name="por_pessoa"
          inputMode="decimal"
          defaultValue={campoNum(item?.quantity_per_person)}
          placeholder="Vazio = sugestão do site"
        />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="alcoolico" defaultChecked={item?.is_alcoholic} className="size-5 accent-bottle" />
        Bebida alcoólica
      </label>
      <p className="rounded-md bg-surface p-2 text-sm sm:col-span-2" aria-live="polite">
        Custo total (preço × quantidade): <strong>{formatarCentavos(total)}</strong>
      </p>
    </div>
  );
}
