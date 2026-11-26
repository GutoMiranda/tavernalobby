# CLAUDE.md — Taverna O Lobby

Regras permanentes deste projeto. Leia em toda sessão.

## Contexto

- Produto: site privado para um grupo de até 20 pessoas organizar encontros (aventuras). Escopo completo e fonte da verdade: `docs/escopo.md`. Progresso: `docs/progresso.md`.
- Dono e único admin: `guto.miranda90@gmail.com`. Ele é QA, conduz o projeto com IA e valida tudo com os usuários reais.
- Ambiente do dono: Windows (use comandos de PowerShell nas instruções para ele).

## Recursos do projeto

- Repositório: https://github.com/GutoMiranda/tavernalobby
- Supabase: projeto `kbxggslfrswvjercojfl` → URL `https://kbxggslfrswvjercojfl.supabase.co`
- Google Cloud: projeto `rotaschacara` (OAuth do login Google e chaves do Google Maps)
- Vercel: conta `gutomiranda90-gmailcoms-projects`, plano Hobby

## Regras de trabalho

1. Leia `docs/escopo.md` antes de implementar qualquer coisa. Se algo não estiver definido, escolha a opção mais simples coerente com o escopo e registre a decisão em `docs/decisoes.md`.
2. Trabalhe em etapas pequenas. Ao fim de cada etapa: rode lint, typecheck e testes; faça commit com mensagem clara em português; atualize `docs/progresso.md`.
3. **Pontos de parada**: quando precisar de algo que só o dono pode fazer (criar chave, configurar painel, colar segredo), PARE, explique o passo a passo exato em português e espere ele confirmar.
4. **Segredos**: nunca escreva chaves, senhas ou tokens em arquivos versionados, commits, logs ou mensagens. Use `.env.local` (no `.gitignore`) e mantenha `.env.example` só com os nomes das variáveis. Se o dono colar um segredo no chat, use-o só para gravar no `.env.local` e não repita o valor.
5. **Custo zero**: não adicione serviço pago nem dependência que exija plano pago.
6. **Banco**: toda mudança de schema é uma migração SQL versionada em `supabase/migrations/`. RLS habilitado em toda tabela nova, com testes das políticas.
7. **Dinheiro**: valores em centavos (inteiro). Regras de rateio em funções puras TypeScript em `src/lib/finance/`, cobertas por testes Vitest, incluindo o exemplo do escopo (R$ 3.000, 28 dias-pessoa).
8. **Interface**: celular primeiro, português do Brasil, R$ e `dd/mm/aaaa`, fuso `America/Sao_Paulo`. Siga a regra de clareza dos termos temáticos (termo + palavra comum). Use a paleta e as fontes do escopo.
9. **Testes**: Vitest para regras e permissões; Playwright para os fluxos principais do MVP. Não marque uma etapa como pronta com teste falhando.
10. Não apague dados financeiros: estorne com lançamento inverso.
11. Prefira bibliotecas maduras e populares; explique ao dono, em uma frase, qualquer dependência nova.
