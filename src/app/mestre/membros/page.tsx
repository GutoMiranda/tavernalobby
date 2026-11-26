import type { Metadata } from "next";

import { AcaoForm } from "@/components/acao-form";
import { CopiarBotao } from "@/components/copiar-botao";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exigirPermissao } from "@/lib/auth";
import { formatarData } from "@/lib/format";

import {
  atribuirTag,
  banirMembro,
  criarFamiliaTeste,
  decidirMembro,
  excluirFamiliaTeste,
  excluirMembro,
  novoCodigoConvite,
  removerTag,
} from "../actions";

export const metadata: Metadata = { title: "Membros" };

type Membro = {
  id: string;
  name: string;
  email: string | null;
  status: "pending" | "approved" | "rejected" | "banned";
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
  const { supabase, pessoa, permissoes } = await exigirPermissao("membros", "ver");
  const aprova = permissoes.membros.editar;
  const modera = permissoes.membros.excluir;
  const podeModerar = (m: Membro) => modera && !m.is_admin && m.id !== pessoa.id;
  const mestre = pessoa.is_admin;

  const [{ data: grupo }, { data: membros }, { data: tags }, { data: familiasTeste }] = await Promise.all([
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
    supabase
      .from("households")
      .select("id, name, people!people_household_id_fkey(id, is_child)")
      .eq("is_test", true)
      .order("created_at")
      .returns<{ id: string; name: string; people: { id: string; is_child: boolean }[] }[]>(),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const linkConvite = grupo ? `${base}/convite/${grupo.invite_code}` : null;
  const textoWhatsApp = linkConvite
    ? `Você foi convidado para a Taverna O Lobby, onde a party organiza as aventuras! Entre por aqui: ${linkConvite}`
    : "";

  const pendentes = (membros ?? []).filter((m) => m.status === "pending");
  const aprovados = (membros ?? []).filter((m) => m.status === "approved");
  const recusados = (membros ?? []).filter((m) => m.status === "rejected");
  const banidos = (membros ?? []).filter((m) => m.status === "banned");
  const nomeTag = new Map((tags ?? []).map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-wood">Membros · aprovação</h2>

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
            {aprova && (
              <AcaoForm
                action={novoCodigoConvite}
                textoBotao="Gerar novo link"
                variante="ghost"
                tamanho="sm"
                textoEnviando="Gerando…"
              />
            )}
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
                    {aprova && (
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
                    )}
                    {podeModerar(m) && <Moderacao membro={m} />}
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
              A tag é só o título que aparece no avatar (ex.: Guardião do Baú). O que cada um pode fazer fica em
              Permissões.
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
                              {mestre && (
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
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {mestre && disponiveis.length > 0 && (
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
                    {podeModerar(m) && <Moderacao membro={m} />}
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
                    <li key={m.id} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {m.name} · {m.email}
                        {aprova && (
                          <AcaoForm
                            action={decidirMembro}
                            textoBotao="Aprovar mesmo assim"
                            variante="link"
                            tamanho="sm"
                          >
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="decisao" value="aprovar" />
                          </AcaoForm>
                        )}
                      </div>
                      {podeModerar(m) && <Moderacao membro={m} />}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {banidos.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Banidos ({banidos.length})</summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {banidos.map((m) => (
                    <li key={m.id} className="flex flex-col gap-1">
                      <p>
                        {m.name} · {m.email}
                      </p>
                      {podeModerar(m) && <Moderacao membro={m} />}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
      {aprova && (
        <Card>
          <CardHeader>
            <CardTitle>Famílias de teste</CardTitle>
            <CardDescription>
              Núcleos de mentira, sem login, para simular presença, custos, divisão e Baú antes de usar com o grupo.
              Aparecem com “[Teste]” no nome. Marque a presença deles na aba Presença (no Salão do Mestre). Ao apagar,
              sai tudo o que foi lançado para eles, inclusive no Baú.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(familiasTeste ?? []).length > 0 && (
              <ul className="flex flex-col gap-2">
                {(familiasTeste ?? []).map((f) => {
                  const criancas = f.people.filter((p) => p.is_child).length;
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
                    >
                      <span>
                        <span className="font-medium">{f.name}</span>{" "}
                        <span className="text-sm text-muted-foreground">
                          · {f.people.length - criancas} {f.people.length - criancas === 1 ? "adulto" : "adultos"}
                          {criancas ? `, ${criancas} ${criancas === 1 ? "criança" : "crianças"}` : ""}
                        </span>
                      </span>
                      {modera && (
                        <AcaoForm
                          action={excluirFamiliaTeste}
                          textoBotao="Apagar"
                          textoEnviando="Apagando…"
                          variante="ghost"
                          tamanho="sm"
                        >
                          <input type="hidden" name="id" value={f.id} />
                        </AcaoForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <AcaoForm action={criarFamiliaTeste} textoBotao="Criar família de teste" limparAoConcluir>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="teste-nome">Nome</Label>
                  <Input id="teste-nome" name="nome" maxLength={60} placeholder="Ex.: Silva" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="teste-adultos">Adultos</Label>
                  <Input id="teste-adultos" name="adultos" type="number" min={1} max={10} defaultValue={2} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="teste-criancas">Crianças</Label>
                  <Input id="teste-criancas" name="criancas" type="number" min={0} max={10} defaultValue={0} required />
                </div>
              </div>
            </AcaoForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Banir/desbanir e excluir cadastro, escondidos atrás de um "Moderar" para não clicar sem querer. */
function Moderacao({ membro }: { membro: Membro }) {
  const banido = membro.status === "banned";
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer text-muted-foreground select-none hover:text-alert">
        {banido ? "Desbanir ou excluir…" : "Banir ou excluir…"}
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-md border border-alert/40 p-3">
        {banido ? (
          <AcaoForm
            action={banirMembro}
            textoBotao="Desbanir (volta como membro aprovado)"
            variante="outline"
            tamanho="sm"
            textoEnviando="Desbanindo…"
          >
            <input type="hidden" name="id" value={membro.id} />
            <input type="hidden" name="banir" value="nao" />
          </AcaoForm>
        ) : (
          <AcaoForm action={banirMembro} textoBotao="Banir" variante="outline" tamanho="sm" textoEnviando="Banindo…">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Banir</strong> bloqueia o acesso de {membro.name} na hora, mesmo com o
              link de convite. Presenças, Baú e Pix continuam nas contas. Dá para desfazer.
            </p>
            <input type="hidden" name="id" value={membro.id} />
            <input type="hidden" name="banir" value="sim" />
          </AcaoForm>
        )}
        <AcaoForm
          action={excluirMembro}
          textoBotao="Excluir cadastro"
          variante="destructive"
          tamanho="sm"
          textoEnviando="Excluindo…"
        >
          <p className="text-muted-foreground">
            <strong className="text-foreground">Excluir</strong> apaga o cadastro e a conta de acesso (ideal para contas
            de teste ou duplicadas). Se a pessoa já tiver dinheiro ou custos nas contas, o site recusa e sugere banir.
            Não dá para desfazer; ela só volta por um convite novo.
          </p>
          <input type="hidden" name="id" value={membro.id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirmo" required className="size-4 accent-[var(--alert)]" />
            Entendi, quero excluir {membro.name}
          </label>
        </AcaoForm>
      </div>
    </details>
  );
}
