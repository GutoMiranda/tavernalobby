# Decisões — Taverna O Lobby

Decisões que o escopo não cobre. Formato: data · decisão · motivo.

1. **24/11/2026 · Desenvolvimento na nuvem, teste no PC do dono.** O código é escrito numa sessão do Claude Code na nuvem e enviado para o branch `claude/project-thread-bn1yfh`, com um PR por etapa para `main`. O dono testa no Windows com `git pull`, `npm install` e o seu `.env.local`. Motivo: os segredos ficam só no PC do dono e na Vercel, nunca na sessão.
2. **24/11/2026 · Migrações aplicadas pelo dono.** Os comandos da CLI do Supabase que precisam da senha do banco (`npx supabase link` e `npx supabase db push`) rodam no PowerShell do dono. Motivo: a senha do banco nunca passa pela conversa.
3. **24/11/2026 · Gerenciador de pacotes: npm.** Motivo: já vem com o Node no Windows; nada a instalar.
4. **24/11/2026 · Testes de RLS com Postgres local.** As políticas são testadas com Vitest contra um Postgres de teste com o schema das migrações, simulando os papéis (`auth.uid()`), sem tocar no projeto real. Motivo: testar permissões sem chaves nem custo.
5. **24/11/2026 · Next.js 15 (não 16).** Versão estável e madura, com Tailwind CSS 4 e React 19.
6. **24/11/2026 · Componentes shadcn/ui copiados à mão.** O registro do shadcn não estava acessível na sessão; os componentes (`button`, `card`, `badge`, `input`, `label`) são os mesmos do shadcn, com o `components.json` pronto para o `npx shadcn add` funcionar no PC do dono.
7. **24/11/2026 · Só modo claro.** O escopo pede modo claro com cartões em pergaminho; não há modo escuro no MVP.
8. **24/11/2026 · Service worker sem cache.** Existe só para o app ser instalável; os dados são em tempo real, então nada fica guardado offline.
9. **24/11/2026 · Senha do banco no `.env.local`.** `SUPABASE_DB_PASSWORD` fica no `.env.local` do dono e é lida pelo `scripts/db.ps1`, a pedido dele, para não digitar a senha a cada migração.
10. **24/11/2026 · Testes de RLS com PGlite.** Em vez de um Postgres instalado, os testes usam o PGlite (Postgres em WebAssembly, via npm), com uma simulação mínima do Supabase em `tests/db/supabase-shim.sql`. Rodam em qualquer PC com `npm test`, sem Docker. Substitui a decisão 4.
11. **24/11/2026 · Permissões por coluna.** As migrações tiram todos os privilégios padrão de `anon`/`authenticated` e devolvem só o necessário, inclusive por coluna (ex.: ninguém altera `funds.pix_key`, `people.status` ou `fund_transactions.status` direto na tabela; só pelas funções auditadas).
12. **24/11/2026 · Admin pelo e-mail gravado no banco.** O e-mail do admin fica na tabela interna `app_config` (não é segredo). O primeiro login com esse e-mail vira o único admin; um índice único garante que só existe um.
13. **24/11/2026 · "Criança" é o campo `people.is_child`.** O escopo fala em "tag Criança"; para as regras de rateio é mais simples e seguro um campo do que uma tag. Tags de função ficam para Tesoureiro, Despensa e as que o admin criar.
14. **24/11/2026 · Um baú por aventura.** `funds.event_id` é único; a meta é a soma dos custos quando `goal_cents` está vazio.
15. **24/11/2026 · Presença com `days` nulo = período todo.** Mínimo 1 dia; o máximo (total do período) é validado na aplicação, porque depende das datas escolhidas.
16. **24/11/2026 · Dependente sem login nasce aprovado.** Quem cadastra já é um membro aprovado do núcleo.
17. **24/11/2026 · Troca de Pix só notifica quando já havia dados.** A primeira configuração do baú grava histórico, mas não dispara o aviso de 7 dias nem as notificações.
18. **24/11/2026 · Comprovantes em `<id do usuário>/<arquivo>`.** Cada um só envia na própria pasta; membros aprovados leem (por URL assinada); ninguém apaga.
