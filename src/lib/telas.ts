import "server-only";

import { exigirMembro, getPermissoes } from "@/lib/auth";
import type { Area, PermissaoArea } from "@/lib/permissoes";

const NADA: PermissaoArea = { ver: false, editar: false, excluir: false };

/**
 * Cada aba da aventura tem duas versões: a comum (para todos) e a do Salão do Mestre ("gerenciar"),
 * com os controles de administração. Na comum, os controles somem e aparece só o atalho para o Salão.
 */
export async function contextoDaTela(area: Area, gerenciar: boolean) {
  const sessao = await exigirMembro();
  const permissoes = await getPermissoes();
  return {
    ...sessao,
    permissoes,
    /** O que liberar nesta tela (nada na versão comum). */
    perm: gerenciar ? permissoes[area] : NADA,
    /** Mostrar o atalho "Gerenciar no Salão do Mestre" (só na versão comum). */
    atalhoSalao: !gerenciar && permissoes[area].ver,
  };
}
