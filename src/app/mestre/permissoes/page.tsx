import type { Metadata } from "next";
import Link from "next/link";

import { AcaoForm } from "@/components/acao-form";
import { Avatar } from "@/components/personagem/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/auth";
import { carregarMembros } from "@/lib/membros-dados";
import { AREA_INFO, AREAS } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import { salvarPermissoesDaPessoa } from "../actions";

export const metadata: Metadata = { title: "Permissões" };

type Linha = { person_id: string; area: string; can_view: boolean; can_edit: boolean; can_delete: boolean };

const CAIXA = "size-5 accent-[var(--gold)] disabled:opacity-40";

export default async function PermissoesPage({ searchParams }: { searchParams: Promise<{ pessoa?: string }> }) {
  const { supabase, pessoa: eu, permissoes } = await exigirPermissao("permissoes", "ver");
  const { pessoa: escolhidaId } = await searchParams;
  const [membros, { data: linhas }] = await Promise.all([
    carregarMembros(supabase),
    supabase.from("person_permissions").select("person_id, area, can_view, can_edit, can_delete").returns<Linha[]>(),
  ]);
  const ordenados = [...membros].sort(
    (a, b) => Number(b.papel === "mestre") - Number(a.papel === "mestre") || a.name.localeCompare(b.name),
  );
  const porPessoa = new Map<string, Map<string, Linha>>();
  for (const l of linhas ?? []) {
    if (!porPessoa.has(l.person_id)) porPessoa.set(l.person_id, new Map());
    porPessoa.get(l.person_id)!.set(l.area, l);
  }
  const escolhida =
    ordenados.find((m) => m.id === escolhidaId) ?? ordenados.find((m) => m.papel !== "mestre" && m.id !== eu.id);
  const ehMestre = escolhida?.papel === "mestre";
  const souEu = escolhida?.id === eu.id;
  const podeMudar = permissoes.permissoes.editar && !!escolhida && !ehMestre && !souEu;
  const perm = escolhida ? porPessoa.get(escolhida.id) : undefined;

  const tabela = (
    <fieldset disabled={!podeMudar}>
      <legend className="sr-only">Permissões de {escolhida?.name} por aba</legend>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th scope="col" className="py-1.5 pr-2 font-medium">
              Aba
            </th>
            <th scope="col" className="w-16 py-1.5 text-center font-medium">
              Ver
            </th>
            <th scope="col" className="w-16 py-1.5 text-center font-medium">
              Editar
            </th>
            <th scope="col" className="w-16 py-1.5 text-center font-medium">
              Excluir
            </th>
          </tr>
        </thead>
        <tbody>
          {AREAS.map((a) => {
            const p = perm?.get(a);
            const info = AREA_INFO[a];
            const marcado = (v: boolean | undefined) => ehMestre || !!v;
            return (
              <tr key={a} className="border-b border-border/50 align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="font-medium text-parchment">{info.nome}</span>{" "}
                  <span className="text-muted-foreground">({info.comum})</span>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">o que libera</summary>
                    <p>Editar: {info.editar}.</p>
                    {info.excluir !== "—" && <p>Excluir: {info.excluir}.</p>}
                  </details>
                </th>
                <td className="py-2 text-center">
                  <input
                    type="checkbox"
                    name={`${a}:ver`}
                    defaultChecked={marcado(p?.can_view)}
                    aria-label={`${info.nome}: ver`}
                    className={CAIXA}
                  />
                </td>
                <td className="py-2 text-center">
                  <input
                    type="checkbox"
                    name={`${a}:editar`}
                    defaultChecked={marcado(p?.can_edit)}
                    aria-label={`${info.nome}: editar`}
                    className={CAIXA}
                  />
                </td>
                <td className="py-2 text-center">
                  {info.excluir === "—" ? (
                    <span className="text-muted-foreground" aria-label="Não se aplica">
                      —
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      name={`${a}:excluir`}
                      defaultChecked={marcado(p?.can_delete)}
                      aria-label={`${info.nome}: excluir`}
                      className={CAIXA}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold text-wood">Permissões por pessoa</h2>
        <p className="text-muted-foreground">
          Escolha um membro e marque, em cada aba, o que ele pode <strong>ver</strong> (a área aparece no Salão),{" "}
          <strong>editar</strong> (criar e alterar) e <strong>excluir</strong> (remover, estornar, cancelar). O banco
          confere cada ação. Ninguém muda as próprias permissões, e o Mestre já pode tudo.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Membros</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {ordenados.map((m) => {
                const qtd = porPessoa.get(m.id)?.size ?? 0;
                const ativa = m.id === escolhida?.id;
                return (
                  <li key={m.id} className="shrink-0">
                    <Link
                      href={`/mestre/permissoes?pessoa=${m.id}`}
                      aria-current={ativa ? "true" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                        ativa ? "border-gold bg-gold/15" : "border-border bg-surface hover:border-gold/50",
                      )}
                    >
                      <Avatar
                        nome={m.name}
                        avatar={m.avatar}
                        foto={m.foto}
                        cor={m.avatar_color}
                        papel={m.papel}
                        tamanho={34}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-parchment">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.papel === "mestre"
                            ? "Mestre · pode tudo"
                            : qtd === 0
                              ? "sem permissões"
                              : `${qtd} ${qtd === 1 ? "aba liberada" : "abas liberadas"}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {escolhida ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {escolhida.name}
                {ehMestre && <Badge>Mestre da Taverna</Badge>}
                {souEu && !ehMestre && <Badge variant="outline">você</Badge>}
              </CardTitle>
              <CardDescription>
                {ehMestre
                  ? "O Mestre pode tudo em todas as abas."
                  : souEu
                    ? "Suas permissões só podem ser mudadas por outra pessoa com acesso a esta tela."
                    : podeMudar
                      ? "Marque e salve. Marcar editar ou excluir já libera o ver."
                      : "Você pode ver, mas não mudar as permissões."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!podeMudar ? (
                tabela
              ) : (
                <AcaoForm
                  action={salvarPermissoesDaPessoa}
                  textoBotao="Salvar permissões"
                  textoEnviando="Salvando…"
                  key={escolhida.id}
                >
                  <input type="hidden" name="pessoa" value={escolhida.id} />
                  {tabela}
                </AcaoForm>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="px-6 text-muted-foreground">Nenhum outro membro aprovado ainda.</Card>
        )}
      </div>
    </div>
  );
}
