# Prompt de execução — Taverna O Lobby

Cole o bloco abaixo no Claude Code, aberto na pasta do repositório (com `CLAUDE.md` na raiz e `docs/escopo.md` e `docs/setup.md` já copiados).

---

```text
Você vai construir o MVP do "Taverna O Lobby", um site privado para um grupo de até 20 pessoas organizar encontros (chamados de "aventuras"): datas, estalagens (hospedagens), presença, custos divididos, caixinha (baú) e despensa (armazém).

ANTES DE TUDO
1. Leia CLAUDE.md, docs/escopo.md e docs/setup.md por completo. O escopo é a fonte da verdade; CLAUDE.md tem as regras de trabalho, que valem em todas as etapas.
2. Crie docs/progresso.md com a lista de etapas abaixo como checklist, e docs/decisoes.md para registrar decisões que o escopo não cobre.
3. Me mostre, em até 15 linhas, seu plano de execução e qualquer dúvida que BLOQUEIE o início. Dúvidas que não bloqueiam: decida pelo mais simples, registre em docs/decisoes.md e siga.

COMO TRABALHAR
- Uma etapa por vez, na ordem. Ao fim de cada etapa: lint + typecheck + testes passando, commit em português, docs/progresso.md atualizado, e um resumo curto para mim do que fazer para testar no navegador.
- PONTO DE PARADA: sempre que precisar de algo que só eu faço (painel do Supabase, Google Cloud, Vercel, colar uma chave), pare e me dê o passo a passo exato em português, citando a seção de docs/setup.md, e espere eu dizer "feito".
- Nunca escreva segredos em arquivos versionados, commits ou na conversa. Use .env.local e mantenha .env.example só com os nomes.
- Estou no Windows: comandos para mim em PowerShell.

ETAPAS DO MVP

Etapa 1 — Base do projeto
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, ESLint, Vitest e Playwright configurados.
- Tema "Taverna O Lobby": paleta e fontes (Cinzel nos títulos, Inter no texto) do escopo, modo claro com cartões em pergaminho e cabeçalho em madeira; logo SVG simples (caneca com d20).
- PWA: manifest, ícones gerados do logo, instalável no Android e iPhone.
- .env.example com as variáveis de docs/setup.md. Página inicial temporária com o tema aplicado.
- PONTO DE PARADA: peça que eu preencha o .env.local com as chaves do Supabase (setup.md, seção 2).

Etapa 2 — Banco e segurança
- Configure a CLI do Supabase via npx e ligue ao projeto kbxggslfrswvjercojfl (PONTO DE PARADA se precisar da senha do banco ou de login na CLI).
- Migrações SQL com todas as tabelas do MVP da seção 7 do escopo, valores em centavos, timestamps, created_by.
- RLS em todas as tabelas: membro não aprovado só vê o próprio status; membros aprovados leem dados do grupo; escrita conforme papéis (admin, tag Tesoureiro, participante, responsável pelo núcleo).
- Funções security definer para: aprovar membro, atribuir tag, confirmar/recusar depósito, registrar saída, estornar, alterar banco/Pix (grava fund_settings_history e cria notifications para todos).
- O e-mail guto.miranda90@gmail.com vira admin automaticamente no primeiro login (via ADMIN_EMAIL ou seed), e é o único admin.
- Bucket privado de comprovantes com políticas.
- Testes das políticas: participante não confirma depósito; tesoureiro não altera Pix; não aprovado não lê dados.

Etapa 3 — Login, convite e família
- Login com Google e link mágico (Supabase Auth). PONTO DE PARADA: me guie pelo setup.md seção 3 para criar o OAuth no projeto rotaschacara e configurar o provider e as URLs no Supabase.
- Link de convite do grupo; tela "Aguardando aprovação"; tela do admin para aprovar membros e atribuir tags.
- "Minha família": cadastrar, editar e remover dependentes (nome, parentesco, tag Criança); convite para um adulto dependente assumir o próprio perfil.

Etapa 4 — Aventuras, datas e estalagens
- Admin cria aventura; painel com fase atual, próximo passo, contagem regressiva e "Minhas pendências".
- Datas candidatas com curtir/descurtir por adulto e ranking pelo saldo; admin fecha.
- Estalagens: qualquer membro cadastra (link, preço total, capacidade, endereço, fotos, notas); custo estimado por pessoa; curtir/descurtir; admin escolhe a final.
- Origem de cada núcleo com Google Places Autocomplete, e mapa (Maps JavaScript API) com origens e estalagens. PONTO DE PARADA: me guie pelo setup.md seção 4 (faturamento, alerta de orçamento, APIs, cota diária e as duas chaves restritas).
- Tempo real (Supabase Realtime) nas reações e listas.

Etapa 5 — Presença e custos
- Presença por pessoa do núcleo: vai/não vai, período todo ou número de dias (1 até o total), opt-in de álcool.
- Itens de custo por categoria com as regras da seção 5 do escopo, em funções puras em src/lib/finance/, com testes Vitest cobrindo: crianças com peso zero, acomodação proporcional aos dias, alimentação inteira, álcool só para opt-in, extras configuráveis, ajuste de peso, arredondamento em centavos que fecha o total exato, e o exemplo de R$ 3.000 / 28 dias-pessoa (R$ 321,43 e R$ 107,14, com o ajuste de 1 centavo no núcleo do admin para fechar R$ 3.000,00).
- Tela "Minha parte" com memória de cálculo por item, e total por núcleo.

Etapa 6 — Baú (caixinha)
- Configuração pelo admin: banco, titular, chave Pix, QR code gerado da chave (payload Pix estático), meta total e por núcleo.
- Depósitos com comprovante, status pendente/confirmado/recusado; confirmação por Tesoureiro; notificação "Loot guardado" para quem depositou.
- Saídas e estornos com motivo; nada é apagado.
- Painel: pilha de tesouro (saldo), % da meta, quanto falta por núcleo, histórico, plano mensal sugerido.
- Troca de banco/Pix: só admin, com aviso destacado por 7 dias, notificação no site para todos e e-mail para todos via Gmail SMTP (Nodemailer, só no servidor). PONTO DE PARADA: me guie pelo setup.md seção 5 para criar a senha de app.

Etapa 7 — Armazém e notificações
- Armazém: itens, quantidade sugerida pelo número de pessoas (adultos e crianças), unidade, responsável, comprado, alcoólico, custo; integração automática com os custos de Alimentação e Bebidas alcoólicas.
- Sino de notificações no cabeçalho, com lidas/não lidas, em tempo real.

Etapa 8 — Qualidade e deploy
- Testes Playwright dos fluxos: login (mock), aprovação, criar aventura, curtir data, cadastrar estalagem, confirmar presença, registrar e confirmar depósito, trocar Pix e ver o aviso.
- Revisão de acessibilidade (contraste AA, foco, rótulos) e de layout em 375 px.
- Revisão de segurança: nenhum segredo no bundle do navegador, RLS conferido, service role só no servidor.
- PONTO DE PARADA: me guie pelo setup.md seção 6 para importar o repositório na Vercel e cadastrar as variáveis; depois, atualizar as URLs no Google Cloud e no Supabase.
- Escreva docs/manual-do-grupo.md: como entrar, instalar o app no celular e usar cada área, em linguagem simples e no tom da taverna.

CRITÉRIO DE PRONTO DO MVP
Um encontro real pode ser organizado do zero no site, por pessoas no celular, sem planilha paralela, com todos os testes passando e o site publicado na Vercel.

Fases 2 e 3 do escopo ficam para depois: não as implemente agora, mas não tome decisões que as impeçam.

Comece pela leitura e pelo plano.
```
