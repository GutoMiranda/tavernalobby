# Progresso do MVP — Taverna O Lobby

Legenda: [ ] a fazer · [~] em andamento · [x] pronto (lint + typecheck + testes passando)

- [x] **Etapa 1 — Base do projeto**: Next.js + TS + Tailwind + shadcn/ui, ESLint, Vitest, Playwright; tema da taverna; logo SVG; PWA; `.env.example`; página inicial temporária. Parada: `.env.local` com chaves do Supabase (setup §2).
- [x] **Etapa 2 — Banco e segurança**: CLI do Supabase; migrações da seção 7; RLS; funções `security definer`; admin automático; bucket de comprovantes; testes das políticas.
- [x] **Etapa 3 — Login, convite e família**: Google + link mágico (setup §3); convite; "Aguardando aprovação"; aprovação e tags; "Minha família".
- [~] **Etapa 4 — Aventuras, datas e estalagens**: painel; votação de datas; estalagens; origens com Places; mapa (setup §4); tempo real.
- [ ] **Etapa 5 — Presença e custos**: presença por pessoa; regras de rateio em `src/lib/finance/` com testes; "Minha parte".
- [ ] **Etapa 6 — Baú (caixinha)**: configuração e QR Pix; depósitos e confirmação; saídas e estornos; painel; troca de Pix com aviso, notificação e e-mail (setup §5).
- [ ] **Etapa 7 — Armazém e notificações**: despensa integrada aos custos; sino em tempo real.
- [ ] **Etapa 8 — Qualidade e deploy**: Playwright dos fluxos; acessibilidade e 375 px; revisão de segurança; Vercel (setup §6); páginas públicas `/privacidade` e `/termos` e publicação do app OAuth no Google (Branding + "Publicar app"); `docs/manual-do-grupo.md`.

## Registro

- 24/11/2026: documentação copiada para o repositório; plano apresentado ao dono.
- 24/11/2026: Etapa 1 implementada (Next.js 15, Tailwind 4, shadcn/ui, Vitest, Playwright, tema, logo, PWA). Lint, typecheck, Vitest e Playwright passando. Aguardando o dono preencher o `.env.local` (ponto de parada).
- 24/11/2026: dono preencheu o `.env.local` e rodou `npx supabase login`. Etapa 1 concluída.
- 24/11/2026: Etapa 2 implementada: 3 migrações (schema, segurança, comprovantes), RLS em todas as tabelas, funções security definer e 30 testes de políticas (PGlite). Aguardando o dono aplicar as migrações (`.\scripts\db.ps1 link` e `push`).
- 24/11/2026: migrações da Etapa 2 aplicadas no Supabase pelo dono. Etapa 2 concluída.
- 24/11/2026: Etapa 3 implementada (login Google e link mágico, convite do grupo, "Aguardando aprovação", membros e tags, "Minha família", convite para adulto dependente). 45 testes Vitest e 4 Playwright passando. Aguardando o dono configurar o OAuth (setup §3) e aplicar a migração 4.
- 24/11/2026: o Google só publica o app OAuth com links de página inicial e política de privacidade. Até o deploy, o app fica em "Testando" com os membros como usuários de teste (limite de 100).
- 24/11/2026: dono testou login Google, convite, aprovação e família. Etapa 3 concluída.
- 24/11/2026: Etapa 4 implementada (aventuras, painel com pendências e contagem regressiva, votação de datas, estalagens, origem do núcleo, mapa, tempo real). 58 testes Vitest e 4 Playwright passando. Aguardando o dono configurar o Google Maps (setup §4) e aplicar a migração 5.
- 24/11/2026: melhorias pedidas pelo dono: layout largo e responsivo, edição de estalagem, estalagens em grade, preço por adulto só em Custos, aba "Geral · rotas" com ponto de encontro (migração 7) e rotas por carro, moto, ônibus/metrô e a pé. 74 testes Vitest e 4 Playwright passando. Aguardando o dono aplicar a migração 7 e ativar a Maps Embed API.
