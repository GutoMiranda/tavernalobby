# Taverna O Lobby

Site privado para o grupo organizar encontros (aventuras): datas, estalagens, presença, custos, baú (caixinha) e armazém (despensa).

- Escopo: [docs/escopo.md](docs/escopo.md) · Configuração: [docs/setup.md](docs/setup.md)
- Progresso: [docs/progresso.md](docs/progresso.md) · Decisões: [docs/decisoes.md](docs/decisoes.md)

## Rodar no PC (PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local   # depois preencha as chaves (docs/setup.md)
npm run dev                          # abre em http://localhost:3000
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Site em modo de desenvolvimento |
| `npm run verificar` | Lint + typecheck + testes Vitest |
| `npm run test:e2e` | Testes Playwright (antes, uma vez: `npx playwright install chromium`) |
| `npm run icones` | Gera os ícones do PWA a partir de `public/icons/logo.svg` |
| `.\scripts\db.ps1 push` | Aplica as migrações no Supabase (usa a senha do `.env.local`) |
