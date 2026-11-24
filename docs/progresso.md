# Progresso do MVP — Taverna O Lobby

Legenda: [ ] a fazer · [~] em andamento · [x] pronto (lint + typecheck + testes passando)

- [x] **Etapa 1 — Base do projeto**: Next.js + TS + Tailwind + shadcn/ui, ESLint, Vitest, Playwright; tema da taverna; logo SVG; PWA; `.env.example`; página inicial temporária. Parada: `.env.local` com chaves do Supabase (setup §2).
- [~] **Etapa 2 — Banco e segurança**: CLI do Supabase; migrações da seção 7; RLS; funções `security definer`; admin automático; bucket de comprovantes; testes das políticas.
- [ ] **Etapa 3 — Login, convite e família**: Google + link mágico (setup §3); convite; "Aguardando aprovação"; aprovação e tags; "Minha família".
- [ ] **Etapa 4 — Aventuras, datas e estalagens**: painel; votação de datas; estalagens; origens com Places; mapa (setup §4); tempo real.
- [ ] **Etapa 5 — Presença e custos**: presença por pessoa; regras de rateio em `src/lib/finance/` com testes; "Minha parte".
- [ ] **Etapa 6 — Baú (caixinha)**: configuração e QR Pix; depósitos e confirmação; saídas e estornos; painel; troca de Pix com aviso, notificação e e-mail (setup §5).
- [ ] **Etapa 7 — Armazém e notificações**: despensa integrada aos custos; sino em tempo real.
- [ ] **Etapa 8 — Qualidade e deploy**: Playwright dos fluxos; acessibilidade e 375 px; revisão de segurança; Vercel (setup §6); `docs/manual-do-grupo.md`.

## Registro

- 24/11/2026: documentação copiada para o repositório; plano apresentado ao dono.
- 24/11/2026: Etapa 1 implementada (Next.js 15, Tailwind 4, shadcn/ui, Vitest, Playwright, tema, logo, PWA). Lint, typecheck, Vitest e Playwright passando. Aguardando o dono preencher o `.env.local` (ponto de parada).
- 24/11/2026: dono preencheu o `.env.local` e rodou `npx supabase login`. Etapa 1 concluída.
- 24/11/2026: Etapa 2 implementada: 3 migrações (schema, segurança, comprovantes), RLS em todas as tabelas, funções security definer e 30 testes de políticas (PGlite). Aguardando o dono aplicar as migrações (`.\scripts\db.ps1 link` e `push`).
