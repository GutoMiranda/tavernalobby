import type { Metadata } from "next";
import Link from "next/link";

import { Ajuda } from "@/components/ajuda";
import { IconeMantimentos } from "@/components/icones";
import { GavetaNovoItem } from "@/components/armazem/gaveta-novo-item";
import { type LinhaArmazem, TabelaArmazem } from "@/components/armazem/tabela-armazem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { carregarAventura } from "@/lib/aventura-dados";
import { carregarCustos } from "@/lib/custos-dados";
import { consumoDeReferencia, custosDoArmazem, pessoasDia, quantidadeSugerida } from "@/lib/finance/armazem";
import { formatarCentavos } from "@/lib/format";

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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <IconeMantimentos className="text-gold" /> Armazém · lista de compras
            </CardTitle>
            <GavetaNovoItem eventoId={id} />
          </div>
          <Ajuda resumo="Tudo o que vamos comprar e quanto custa.">
            O custo entra sozinho na divisão de{" "}
            <Link href={`/aventuras/${id}/custos`} className="text-bottle underline">
              Custos
            </Link>
            : comida e bebidas sem álcool para todos os adultos que vão; bebidas alcoólicas só para quem marcou na
            Presença. Edite pelo lápis, exclua pela lixeira ou marque vários para excluir de uma vez.
          </Ajuda>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="grid grid-cols-3 gap-2 text-sm">
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{formatarCentavos(alimentacaoCentavos + alcoolCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Comida e sem álcool</p>
              <p className="font-semibold">{formatarCentavos(alimentacaoCentavos)}</p>
            </li>
            <li className="rounded-md bg-surface p-2">
              <p className="text-muted-foreground">Com álcool</p>
              <p className="font-semibold">{formatarCentavos(alcoolCentavos)}</p>
            </li>
          </ul>
          {linhas.length === 0 ? (
            <p className="text-muted-foreground">A lista está vazia. Toque em “+ Item” para adicionar o primeiro.</p>
          ) : (
            <TabelaArmazem linhas={linhas} eventoId={id} />
          )}
          <Ajuda rotulo="Como a quantidade sugerida é calculada?">
            Sugestão de quantidade = consumo por pessoa por dia × pessoas-dia (soma dos dias de cada pessoa confirmada
            na Presença). Hoje: {comida} pessoas-dia comendo (crianças contam) e {bebida} pessoas-dia com bebida
            alcoólica (só adultos que marcaram){totalDias ? "" : "; datas ainda abertas, conta 1 dia por pessoa"}.
          </Ajuda>
        </CardContent>
      </Card>
    </div>
  );
}
