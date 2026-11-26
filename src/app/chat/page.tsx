import type { Metadata } from "next";

import { ChatConversa } from "@/components/chat/chat-conversa";
import { ListaOnlinePagina } from "@/components/chat/lista-online-pagina";
import { IconeCaneca } from "@/components/icones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirMembro, getPermissoes } from "@/lib/auth";
import { carregarMembros } from "@/lib/membros-dados";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const { supabase, pessoa } = await exigirMembro();
  const [membros, permissoes] = await Promise.all([carregarMembros(supabase), getPermissoes()]);
  const eu = membros.find((m) => m.id === pessoa.id) ?? {
    id: pessoa.id,
    name: pessoa.name,
    avatar: pessoa.avatar,
    avatar_color: pessoa.avatar_color,
    epithet: pessoa.epithet,
    foto: null,
    papel: "membro" as const,
  };

  return (
    <div className="grade-taverna">
      <Card className="lg:col-span-2 gap-3 pb-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeCaneca className="text-gold" /> Chat da taverna
          </CardTitle>
          <CardDescription>
            Conversa geral do grupo. Use @ para chamar alguém e “Marcar como dúvida” para perguntas: quem for mencionado
            recebe aviso no sino.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[60vh] flex-col px-0">
          <ChatConversa
            eu={eu}
            moderacao={{ resolver: permissoes.chat.editar, apagar: permissoes.chat.excluir }}
            membros={membros}
            destacarHash
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Na taverna</CardTitle>
          <CardDescription>Quem está com o site aberto agora aparece com a luz verde.</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <ListaOnlinePagina membros={membros} euId={pessoa.id} />
        </CardContent>
      </Card>
    </div>
  );
}
