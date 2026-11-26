import type { Metadata } from "next";
import Link from "next/link";

import { AcaoForm } from "@/components/acao-form";
import { IconeMantimentos } from "@/components/icones";
import { CamposItem } from "@/components/armazem/campos-item";
import { type LinhaArmazem, TabelaArmazem } from "@/components/armazem/tabela-armazem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { carregarCustos } from "@/lib/custos-dados";
import { consumoDeReferencia, custosDoArmazem, pessoasDia, quantidadeSugerida } from "@/lib/finance/armazem";
import { formatarCentavos } from "@/lib/format";

import { criarItemArmazem } from "../../armazem-actions";

export const metadata: Metadata = { title: "Armazém" };

export default async function ArmazemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa } = await exigirMembro();
  const dados = await carregarAventura(supabase, id);
  const { despensa, pessoasRateio, totalDias } = await carregarCustos(supabase, dados);

  const comida = pessoasDia(pessoasRateio, false, totalDias ?? 1);
  const bebida = pessoasDia(pessoasRateio, true, totalDias ?? 1);
  const { alimentacaoCentavos, alcoolCentavos } = custosDoArmazem(despensa);
  const podeExcluirTudo = (await getPermissoes()).armazem.excluir;

  const linhas: LinhaArmazem[] = despensa.map((i) => {
    const consumo = i.quantity_per_person ?? consumoDeReferencia(i.name, i.unit);
    const pd = i.is_alcoholic ? bebida : comida;
    return {
      ...i,
      cost_cents: i.cost_cents ?? 0,
      consumo,
      consumoInformado: i.quantity_per_person != null,
      pessoasDia: pd,
      sugestao: quantidadeSugerida(consumo, pd),
      podeExcluir: podeExcluirTudo || i.created_by === pessoa.id,
    };
  });

  return (
    <div className="grade-taverna">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeMantimentos className="text-gold" /> Armazém · lista de compras
          </CardTitle>
          <CardDescription>
            Tudo o que vamos comprar para a aventura e quanto custa. O custo entra sozinho na divisão de{" "}
            <Link href={`/aventuras/${id}/custos`} className="text-bottle underline">
              Custos
            </Link>
            : comida e bebidas sem álcool para todos os adultos que vão; bebidas alcoólicas só para quem marcou na
            Presença.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Custo total</p>
              <p className="text-lg font-semibold">{formatarCentavos(alimentacaoCentavos + alcoolCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Comida e sem álcool</p>
              <p className="font-semibold">{formatarCentavos(alimentacaoCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Bebidas alcoólicas</p>
              <p className="font-semibold">{formatarCentavos(alcoolCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Itens</p>
              <p className="font-semibold">{despensa.length}</p>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Sugestão de quantidade = consumo por pessoa por dia × pessoas-dia (soma dos dias de cada pessoa confirmada
            na Presença). Hoje: {comida} pessoas-dia comendo (crianças contam) e {bebida} pessoas-dia com bebida
            alcoólica (só adultos que marcaram){totalDias ? "" : "; datas ainda abertas, conta 1 dia por pessoa"}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar item</CardTitle>
          <CardDescription>O custo total é o preço por unidade × a quantidade.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={criarItemArmazem} textoBotao="Adicionar à lista" limparAoConcluir>
            <input type="hidden" name="evento" value={id} />
            <CamposItem prefixo="novo" />
          </AcaoForm>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>
            Edite pelo lápis, exclua pela lixeira ou marque vários para excluir de uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linhas.length === 0 ? (
            <p className="text-muted-foreground">A lista está vazia. Adicione o primeiro item.</p>
          ) : (
            <TabelaArmazem linhas={linhas} eventoId={id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
