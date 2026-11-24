import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CampoLugar } from "@/components/mapas/campo-lugar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLUNAS_PESSOA, exigirMembro, type Pessoa } from "@/lib/auth";

import { adicionarDependente, renomearNucleo, salvarOrigem } from "./actions";
import { PessoaItem } from "./pessoa-item";

export const metadata: Metadata = { title: "Minha família" };

export default async function FamiliaPage() {
  const { supabase, pessoa } = await exigirMembro();

  const [{ data: nucleo }, { data: membros }] = await Promise.all([
    supabase
      .from("households")
      .select("id, name, origin_text")
      .eq("id", pessoa.household_id)
      .single<{ id: string; name: string; origin_text: string | null }>(),
    supabase
      .from("people")
      .select(COLUNAS_PESSOA)
      .eq("household_id", pessoa.household_id)
      .order("created_at")
      .returns<Pessoa[]>(),
  ]);

  const lista = (membros ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    relationship: m.relationship,
    is_child: m.is_child,
    tem_login: !!m.user_id,
    sou_eu: m.id === pessoa.id,
  }));
  const adultos = lista.filter((m) => !m.is_child).length;
  const criancas = lista.length - adultos;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm text-muted-foreground">Minha família · núcleo</p>
        <h1 className="text-2xl font-bold text-wood">{nucleo?.name ?? "Minha família"}</h1>
        <p className="text-muted-foreground">
          {adultos} {adultos === 1 ? "adulto" : "adultos"}
          {criancas > 0 && ` e ${criancas} ${criancas === 1 ? "criança" : "crianças"}`}. Você confirma presença e opções
          por todos daqui, e os valores do núcleo aparecem somados para quem paga.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Quem é da família</CardTitle>
          <CardDescription>Crianças contam para comida e camas, mas não entram no rateio dos custos.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {lista.map((m) => (
              <PessoaItem key={m.id} pessoa={m} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar pessoa</CardTitle>
          <CardDescription>Dependentes não precisam de login. Um adulto pode ganhar login próprio depois.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={adicionarDependente} textoBotao="Adicionar à família" limparAoConcluir>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="novo-nome">Nome</Label>
                <Input id="novo-nome" name="nome" required maxLength={80} autoComplete="off" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="novo-parentesco">Parentesco</Label>
                <Input id="novo-parentesco" name="parentesco" maxLength={40} placeholder="cônjuge, filho, mãe…" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="crianca" className="size-4 accent-bottle" />
              É criança (não entra no rateio de custos)
            </label>
          </AcaoForm>
        </CardContent>
      </Card>

      <Card id="origem">
        <CardHeader>
          <CardTitle>Cidade de saída</CardTitle>
          <CardDescription>
            De onde o núcleo parte para as aventuras. Aparece no mapa
            {nucleo?.origin_text ? `. Atual: ${nucleo.origin_text}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={salvarOrigem} textoBotao="Salvar cidade">
            <CampoLugar id="origem-cidade" rotulo="Cidade" tipo="cidade" valorInicial={nucleo?.origin_text} obrigatorio />
          </AcaoForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nome do núcleo</CardTitle>
          <CardDescription>Como sua família aparece para o grupo.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcaoForm action={renomearNucleo} textoBotao="Salvar nome">
            <Label htmlFor="nucleo-nome" className="sr-only">
              Nome do núcleo
            </Label>
            <Input id="nucleo-nome" name="nome" defaultValue={nucleo?.name ?? ""} required maxLength={80} />
          </AcaoForm>
        </CardContent>
      </Card>
    </div>
  );
}
