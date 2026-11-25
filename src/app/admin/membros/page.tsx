import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CopiarBotao } from "@/components/copiar-botao";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/format";

import { atribuirTag, criarTag, decidirMembro, novoCodigoConvite, removerTag } from "./actions";

export const metadata: Metadata = { title: "Membros e tags" };

type Membro = {
  id: string;
  name: string;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  households: { name: string } | null;
  person_tags: { tag_id: string }[];
};
type Tag = {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
};

export default async function MembrosPage() {
  const { supabase } = await exigirAdmin();

  const [{ data: grupo }, { data: membros }, { data: tags }] = await Promise.all([
    supabase.from("groups").select("invite_code").single<{ invite_code: string }>(),
    supabase
      .from("people")
      .select(
        "id, name, email, status, is_admin, created_at, households!people_household_id_fkey(name), person_tags!person_tags_person_id_fkey(tag_id)",
      )
      .not("user_id", "is", null)
      .order("created_at")
      .returns<Membro[]>(),
    supabase.from("tags").select("id, name, label, description").order("name").returns<Tag[]>(),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const linkConvite = grupo ? `${base}/convite/${grupo.invite_code}` : null;
  const textoWhatsApp = linkConvite
    ? `Você foi convidado para a Taverna O Lobby, onde a party organiza as aventuras! Entre por aqui: ${linkConvite}`
    : "";

  const pendentes = (membros ?? []).filter((m) => m.status === "pending");
  const aprovados = (membros ?? []).filter((m) => m.status === "approved");
  const recusados = (membros ?? []).filter((m) => m.status === "rejected");
  const nomeTag = new Map((tags ?? []).map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm text-muted-foreground">Mestre da Taverna · admin</p>
        <h1 className="text-2xl font-bold text-wood">Membros e tags</h1>
      </section>

      <div className="grade-taverna grade-2">
        <Card>
          <CardHeader>
            <CardTitle>Link de convite</CardTitle>
            <CardDescription>
              Mande no grupo do WhatsApp. Quem entrar por ele aparece aqui para você aprovar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {linkConvite && <code className="rounded-md bg-surface p-2 text-sm break-all">{linkConvite}</code>}
            <div className="flex flex-wrap gap-2">
              {linkConvite && <CopiarBotao texto={textoWhatsApp} rotulo="Copiar convite para o WhatsApp" />}
            </div>
            <AcaoForm
              action={novoCodigoConvite}
              textoBotao="Gerar novo link"
              variante="ghost"
              tamanho="sm"
              textoEnviando="Gerando…"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Aguardando aprovação{" "}
              <Badge variant={pendentes.length ? "gold" : "secondary"} className="align-middle">
                {pendentes.length}
              </Badge>
            </CardTitle>
            <CardDescription>Só quem você aprovar vê os dados do grupo.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém na porta da taverna por enquanto.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pendentes.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {m.email} · entrou em {formatarData(m.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AcaoForm action={decidirMembro} textoBotao="Aprovar" tamanho="sm" textoEnviando="Aprovando…">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="decisao" value="aprovar" />
                      </AcaoForm>
                      <AcaoForm
                        action={decidirMembro}
                        textoBotao="Recusar"
                        variante="outline"
                        tamanho="sm"
                        textoEnviando="Recusando…"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="decisao" value="recusar" />
                      </AcaoForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membros da party</CardTitle>
            <CardDescription>
              Quem tem a tag controla aquela área. O Guardião do Baú (Tesoureiro) confirma depósitos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {aprovados.map((m) => {
                const minhas = m.person_tags.map((pt) => pt.tag_id);
                const disponiveis = (tags ?? []).filter((t) => !minhas.includes(t.id));
                return (
                  <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{m.name}</p>
                      {m.is_admin && <Badge>Mestre da Taverna · admin</Badge>}
                      <span className="text-sm text-muted-foreground">· {m.households?.name}</span>
                    </div>
                    {minhas.length > 0 && (
                      <ul className="flex flex-wrap gap-2" aria-label={`Tags de ${m.name}`}>
                        {minhas.map((id) => {
                          const t = nomeTag.get(id);
                          return (
                            <li key={id} className="flex items-center gap-1">
                              <Badge variant="gold">{t?.label ? `${t.label} · ${t.name}` : t?.name}</Badge>
                              <AcaoForm
                                action={removerTag}
                                textoBotao="Remover"
                                variante="link"
                                tamanho="sm"
                                textoEnviando="…"
                              >
                                <input type="hidden" name="id" value={m.id} />
                                <input type="hidden" name="tag" value={id} />
                              </AcaoForm>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {disponiveis.length > 0 && (
                      <AcaoForm
                        action={atribuirTag}
                        textoBotao="Dar tag"
                        variante="outline"
                        tamanho="sm"
                        textoEnviando="…"
                        className="sm:flex-row sm:items-center"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <Label htmlFor={`tag-${m.id}`} className="sr-only">
                          Tag para {m.name}
                        </Label>
                        <select
                          id={`tag-${m.id}`}
                          name="tag"
                          className="h-8 rounded-md border border-input bg-field px-2 text-sm"
                          defaultValue=""
                          required
                        >
                          <option value="" disabled>
                            Escolha uma tag…
                          </option>
                          {disponiveis.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label ? `${t.label} · ${t.name}` : t.name}
                            </option>
                          ))}
                        </select>
                      </AcaoForm>
                    )}
                  </li>
                );
              })}
            </ul>
            {recusados.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Acessos recusados ({recusados.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {recusados.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2">
                      {m.name} · {m.email}
                      <AcaoForm action={decidirMembro} textoBotao="Aprovar mesmo assim" variante="link" tamanho="sm">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="decisao" value="aprovar" />
                      </AcaoForm>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Criar tag</CardTitle>
            <CardDescription>Para delegar o controle de uma área (ex.: Despensa).</CardDescription>
          </CardHeader>
          <CardContent>
            <AcaoForm action={criarTag} textoBotao="Criar tag" limparAoConcluir>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tag-nome">Nome</Label>
                  <Input id="tag-nome" name="nome" required maxLength={40} placeholder="Ex.: Churrasqueiro" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tag-rotulo">Nome temático (opcional)</Label>
                  <Input id="tag-rotulo" name="rotulo" maxLength={60} placeholder="Ex.: Mestre da Brasa" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tag-descricao">O que essa pessoa controla</Label>
                <Input id="tag-descricao" name="descricao" maxLength={200} />
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
