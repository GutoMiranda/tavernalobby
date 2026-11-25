import { ShoppingBasket, Wine } from "lucide-react";
import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirMembro } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { carregarCustos, type ItemDespensa } from "@/lib/custos-dados";
import { centavosParaCampo } from "@/lib/dinheiro";
import {
  CATEGORIAS_ARMAZEM,
  custosDoArmazem,
  pessoasDia,
  quantidadeSugerida,
  resumoDoArmazem,
} from "@/lib/finance/armazem";
import { formatarCentavos } from "@/lib/format";

import {
  criarItemArmazem,
  definirResponsavel,
  editarItemArmazem,
  marcarComprado,
  removerItemArmazem,
} from "../../armazem-actions";

export const metadata: Metadata = { title: "Armazém" };

const SELECT = "h-10 w-full rounded-md border border-input bg-white px-3 text-base md:text-sm";
const qtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export default async function ArmazemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa, tags } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const custos = await carregarCustos(supabase, dados);
  const { despensa, pessoas, pessoasRateio, totalDias } = custos;

  const dias = totalDias ?? 1;
  const comida = pessoasDia(pessoasRateio, false, dias);
  const bebida = pessoasDia(pessoasRateio, true, dias);
  const { alimentacaoCentavos, alcoolCentavos } = custosDoArmazem(despensa);
  const resumo = resumoDoArmazem(despensa);
  const nome = new Map(pessoas.map((p) => [p.id, p.name]));
  const adultos = pessoas.filter((p) => !p.is_child);
  const podeRemoverTudo = pessoa.is_admin || tags.includes("Despensa");

  const grupos = [...CATEGORIAS_ARMAZEM, null].map((cat) => ({
    cat,
    itens: despensa.filter((i) =>
      cat == null ? !i.category || !CATEGORIAS_ARMAZEM.includes(i.category as never) : i.category === cat,
    ),
  }));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBasket className="size-5 text-bottle" aria-hidden /> Armazém · despensa
          </CardTitle>
          <CardDescription>
            Comida e bebida da aventura: quanto levar, quem leva e quanto custa. O custo dos itens entra sozinho na
            divisão de custos (alcoólicos só para quem marcou bebidas alcoólicas na Presença).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <li className="rounded-md bg-white/50 p-2">
              <p className="text-muted-foreground">Pessoas-dia comendo</p>
              <p className="font-semibold">{comida}</p>
            </li>
            <li className="rounded-md bg-white/50 p-2">
              <p className="text-muted-foreground">Pessoas-dia com álcool</p>
              <p className="font-semibold">{bebida}</p>
            </li>
            <li className="rounded-md bg-white/50 p-2">
              <p className="text-muted-foreground">Comprados</p>
              <p className="font-semibold">
                {resumo.comprados} de {resumo.total}
              </p>
            </li>
            <li className="rounded-md bg-white/50 p-2">
              <p className="text-muted-foreground">Custo total</p>
              <p className="font-semibold">{formatarCentavos(alimentacaoCentavos + alcoolCentavos)}</p>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Comida e bebidas sem álcool: {formatarCentavos(alimentacaoCentavos)} · Bebidas alcoólicas:{" "}
            {formatarCentavos(alcoolCentavos)}
            {resumo.semCusto > 0 &&
              ` · ${resumo.semCusto} ${resumo.semCusto === 1 ? "item sem custo" : "itens sem custo"}`}
            . Pessoas-dia = soma dos dias de cada pessoa confirmada na Presença
            {totalDias ? "" : " (datas ainda abertas: conta 1 dia por pessoa)"}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar item</CardTitle>
          <CardDescription>Use a quantidade por pessoa por dia para o site sugerir o total.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={criarItemArmazem} textoBotao="Adicionar ao armazém" limparAoConcluir>
            <input type="hidden" name="evento" value={id} />
            <CamposItem prefixo="novo" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="eu_levo" className="size-5 accent-bottle" /> Eu levo / eu compro
            </label>
          </AcaoForm>
        </CardContent>
      </Card>

      {despensa.length === 0 && (
        <p className="text-muted-foreground lg:col-span-3">O armazém está vazio. Adicione o primeiro item.</p>
      )}

      {grupos
        .filter((g) => g.itens.length > 0)
        .map((g) => (
          <section key={g.cat ?? "outros"} className="lg:col-span-3" aria-labelledby={`cat-${g.cat ?? "sem"}`}>
            <h2 id={`cat-${g.cat ?? "sem"}`} className="mb-2 font-display text-lg font-bold text-wood">
              {g.cat ?? "Sem categoria"}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.itens.map((item) => (
                <CardItem
                  key={item.id}
                  item={item}
                  eventoId={id}
                  sugestao={quantidadeSugerida(item.quantity_per_person, item.is_alcoholic ? bebida : comida)}
                  pessoasDiaItem={item.is_alcoholic ? bebida : comida}
                  responsavel={item.responsible_person_id ? (nome.get(item.responsible_person_id) ?? "alguém") : null}
                  souResponsavel={item.responsible_person_id === pessoa.id}
                  adultos={adultos}
                  podeRemover={podeRemoverTudo || item.created_by === pessoa.id}
                  editadoPor={item.updated_by ? (nome.get(item.updated_by) ?? null) : null}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function CamposItem({ prefixo, item }: { prefixo: string; item?: ItemDespensa }) {
  const n = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
        <Input
          id={`${prefixo}-un`}
          name="unidade"
          maxLength={20}
          defaultValue={item?.unit ?? ""}
          placeholder="kg, L, pacote…"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-pp`}>Por pessoa por dia</Label>
        <Input
          id={`${prefixo}-pp`}
          name="por_pessoa"
          inputMode="decimal"
          defaultValue={n(item?.quantity_per_person)}
          placeholder="Ex.: 0,3"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-qt`}>Ou quantidade total</Label>
        <Input
          id={`${prefixo}-qt`}
          name="quantidade"
          inputMode="decimal"
          defaultValue={n(item?.quantity)}
          placeholder="Ex.: 12"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-custo`}>Custo total (R$)</Label>
        <Input
          id={`${prefixo}-custo`}
          name="custo"
          inputMode="decimal"
          defaultValue={item?.cost_cents != null ? centavosParaCampo(item.cost_cents) : ""}
          placeholder="Ex.: 250,00"
        />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="alcoolico" defaultChecked={item?.is_alcoholic} className="size-5 accent-bottle" />
        Bebida alcoólica
      </label>
    </div>
  );
}

function CardItem({
  item,
  eventoId,
  sugestao,
  pessoasDiaItem,
  responsavel,
  souResponsavel,
  adultos,
  podeRemover,
  editadoPor,
}: {
  item: ItemDespensa;
  eventoId: string;
  sugestao: number | null;
  pessoasDiaItem: number;
  responsavel: string | null;
  souResponsavel: boolean;
  adultos: { id: string; name: string }[];
  podeRemover: boolean;
  editadoPor: string | null;
}) {
  const unidade = item.unit ? ` ${item.unit}` : "";
  return (
    <li>
      <Card className={item.purchased ? "h-full border-bottle/50 bg-bottle/5" : "h-full"}>
        <CardHeader>
          <CardDescription className="flex flex-wrap gap-1">
            {item.is_alcoholic && (
              <Badge variant="outline" className="gap-1">
                <Wine className="size-3.5" aria-hidden /> Alcoólico
              </Badge>
            )}
            {item.purchased ? <Badge>Comprado</Badge> : <Badge variant="outline">Falta comprar</Badge>}
          </CardDescription>
          <CardTitle className="text-lg">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {item.quantity != null ? (
            <p>
              Quantidade:{" "}
              <strong>
                {qtd.format(item.quantity)}
                {unidade}
              </strong>
              {sugestao != null && sugestao !== item.quantity && (
                <span className="text-muted-foreground">
                  {" "}
                  (sugestão: {qtd.format(sugestao)}
                  {unidade})
                </span>
              )}
            </p>
          ) : sugestao != null ? (
            <p>
              Sugestão:{" "}
              <strong>
                {qtd.format(sugestao)}
                {unidade}
              </strong>{" "}
              <span className="text-muted-foreground">
                ({qtd.format(item.quantity_per_person!)}
                {unidade} por pessoa por dia × {pessoasDiaItem} pessoas-dia)
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">Sem quantidade definida.</p>
          )}
          <p>
            Custo: <strong>{item.cost_cents != null ? formatarCentavos(item.cost_cents) : "a definir"}</strong>
          </p>
          <p>
            Quem leva: <strong>{responsavel ?? "ninguém ainda"}</strong>
          </p>

          <div className="flex flex-wrap items-start gap-2">
            {!souResponsavel && (
              <AcaoForm
                action={definirResponsavel}
                textoBotao="Eu levo"
                tamanho="sm"
                variante="outline"
                textoEnviando="…"
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="evento" value={eventoId} />
                <input type="hidden" name="responsavel" value="eu" />
              </AcaoForm>
            )}
            <AcaoForm
              action={marcarComprado}
              textoBotao={item.purchased ? "Desmarcar comprado" : "Marcar comprado"}
              tamanho="sm"
              variante={item.purchased ? "outline" : "default"}
              textoEnviando="…"
            >
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="evento" value={eventoId} />
              <input type="hidden" name="comprado" value={item.purchased ? "nao" : "sim"} />
            </AcaoForm>
          </div>

          <details>
            <summary className="cursor-pointer font-medium text-bottle">Escolher quem leva</summary>
            <AcaoForm action={definirResponsavel} textoBotao="Salvar" tamanho="sm" className="mt-2">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="evento" value={eventoId} />
              <Label htmlFor={`resp-${item.id}`}>Responsável</Label>
              <select
                id={`resp-${item.id}`}
                name="responsavel"
                className={SELECT}
                defaultValue={item.responsible_person_id ?? ""}
              >
                <option value="">Ninguém</option>
                {adultos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </AcaoForm>
          </details>
          <details>
            <summary className="cursor-pointer font-medium text-bottle">Editar item</summary>
            <AcaoForm action={editarItemArmazem} textoBotao="Salvar item" tamanho="sm" className="mt-2">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="evento" value={eventoId} />
              <CamposItem prefixo={`ed-${item.id}`} item={item} />
            </AcaoForm>
          </details>
          {podeRemover && (
            <details>
              <summary className="cursor-pointer text-alert">Remover</summary>
              <AcaoForm
                action={removerItemArmazem}
                textoBotao="Confirmar remoção"
                variante="destructive"
                tamanho="sm"
                className="mt-2"
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="evento" value={eventoId} />
              </AcaoForm>
            </details>
          )}
          {editadoPor && <p className="text-xs text-muted-foreground">Última alteração por {editadoPor}.</p>}
        </CardContent>
      </Card>
    </li>
  );
}
