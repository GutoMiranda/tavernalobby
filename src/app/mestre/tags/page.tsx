import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirAdmin } from "@/lib/auth";
import { AREA_INFO, AREAS } from "@/lib/permissoes";

import { apagarTag, criarTag, salvarPermissoes } from "../actions";

export const metadata: Metadata = { title: "Tags e permissões" };

type Tag = {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  tag_permissions: { area: string; can_view: boolean; can_edit: boolean; can_delete: boolean }[];
  person_tags: { people: { name: string } | null }[];
};

const CAIXA = "size-5 accent-[var(--gold)]";

export default async function TagsPage() {
  const { supabase } = await exigirAdmin();
  const { data: tags } = await supabase
    .from("tags")
    .select(
      "id, name, label, description, tag_permissions(area, can_view, can_edit, can_delete), person_tags(people!person_tags_person_id_fkey(name))",
    )
    .order("name")
    .returns<Tag[]>();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold text-wood">Tags e permissões</h2>
        <p className="text-muted-foreground">
          Para cada tag, marque em cada aba o que ela pode <strong>ver</strong> (a área aparece no Salão),{" "}
          <strong>editar</strong> (criar e alterar) e <strong>excluir</strong> (remover, estornar, cancelar). Dê a tag
          às pessoas em Membros. O banco confere cada ação, não é só esconder botão. Tags, permissões, chave Pix e meta
          do baú continuam só com você.
        </p>
      </div>

      <div className="grade-taverna grade-2">
        {(tags ?? []).map((t) => {
          const perm = new Map(t.tag_permissions.map((p) => [p.area, p]));
          const pessoas = t.person_tags.map((pt) => pt.people?.name).filter(Boolean) as string[];
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {t.label ? `${t.label} · ${t.name}` : t.name}
                </CardTitle>
                <CardDescription>
                  {t.description ? `${t.description} ` : ""}
                  {pessoas.length ? `Com esta tag: ${pessoas.join(", ")}.` : "Ninguém tem esta tag ainda."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <AcaoForm action={salvarPermissoes} textoBotao="Salvar permissões" textoEnviando="Salvando…">
                  <input type="hidden" name="tag" value={t.id} />
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">Permissões da tag {t.name} por aba</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th scope="col" className="py-1.5 pr-2 font-medium">
                          Aba
                        </th>
                        <th scope="col" className="w-14 py-1.5 text-center font-medium">
                          Ver
                        </th>
                        <th scope="col" className="w-14 py-1.5 text-center font-medium">
                          Editar
                        </th>
                        <th scope="col" className="w-14 py-1.5 text-center font-medium">
                          Excluir
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {AREAS.map((a) => {
                        const p = perm.get(a);
                        const info = AREA_INFO[a];
                        return (
                          <tr key={a} className="border-b border-border/50 align-top">
                            <th scope="row" className="py-2 pr-2 text-left font-normal">
                              <span className="font-medium text-parchment">{info.nome}</span>{" "}
                              <span className="text-muted-foreground">({info.comum})</span>
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer">o que libera</summary>
                                <p>Editar: {info.editar}.</p>
                                <p>Excluir: {info.excluir}.</p>
                              </details>
                            </th>
                            <td className="py-2 text-center">
                              <input
                                type="checkbox"
                                name={`${a}:ver`}
                                defaultChecked={p?.can_view}
                                aria-label={`${info.nome}: ver`}
                                className={CAIXA}
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="checkbox"
                                name={`${a}:editar`}
                                defaultChecked={p?.can_edit}
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
                                  defaultChecked={p?.can_delete}
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
                  <p className="text-xs text-muted-foreground">Marcar editar ou excluir já libera o ver.</p>
                </AcaoForm>
                {t.name !== "Tesoureiro" && (
                  <AcaoForm
                    action={apagarTag}
                    textoBotao="Apagar tag"
                    variante="ghost"
                    tamanho="sm"
                    textoEnviando="Apagando…"
                  >
                    <input type="hidden" name="tag" value={t.id} />
                  </AcaoForm>
                )}
                {t.name === "Tesoureiro" && <Badge variant="outline">Tag fixa do Guardião do Baú</Badge>}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Criar tag</CardTitle>
            <CardDescription>Para delegar uma área (ex.: quem organiza as datas ou cuida das compras).</CardDescription>
          </CardHeader>
          <CardContent>
            <AcaoForm action={criarTag} textoBotao="Criar tag" limparAoConcluir>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tag-nome">Nome</Label>
                  <Input id="tag-nome" name="nome" required maxLength={40} placeholder="Ex.: Organizador" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tag-rotulo">Nome temático (opcional)</Label>
                  <Input id="tag-rotulo" name="rotulo" maxLength={60} placeholder="Ex.: Escriba das Datas" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tag-descricao">O que essa pessoa cuida</Label>
                <Input id="tag-descricao" name="descricao" maxLength={200} />
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
