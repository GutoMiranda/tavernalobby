# Guia de configuração — o que você faz antes e durante

Tudo aqui é feito por você, nos painéis. Nenhuma chave ou senha vai no prompt nem no GitHub: elas ficam no arquivo `.env.local` do seu PC e nas variáveis de ambiente da Vercel.

## 1. Ferramentas no Windows (PowerShell)

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Feche e abra o PowerShell, confira com `node -v` e `git --version`. Instale o Claude Code seguindo a documentação oficial (https://docs.claude.com), e depois:

```powershell
cd $HOME\Documents
git clone https://github.com/GutoMiranda/tavernalobby.git
cd tavernalobby
```

Copie para dentro da pasta os arquivos `CLAUDE.md` (na raiz) e `docs/escopo.md`, `docs/setup.md`, `docs/prompt.md`. Depois rode `claude` nessa pasta e cole o prompt.

## 2. Supabase (projeto kbxggslfrswvjercojfl)

Em **Project Settings → API** (ou "API Keys"), você vai precisar de:

| Variável | Onde | Segredo? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kbxggslfrswvjercojfl.supabase.co` | Não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave "anon"/"publishable" | Pública, mas só no `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave "service_role"/"secret" | **Sim, nunca no navegador** |

Guarde também a senha do banco (definida ao criar o projeto); ela é usada para aplicar migrações pela CLI.

## 3. Login com Google (projeto rotaschacara)

1. Google Cloud Console → **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform"): tipo **Externo**, nome "Taverna O Lobby", seu e-mail de suporte. Escopos: só os básicos (email, profile, openid). Publique o app ("Em produção") para qualquer conta Google do grupo conseguir entrar; com escopos básicos não há revisão do Google.
2. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
   - Origens JavaScript autorizadas: `http://localhost:3000` e, depois do deploy, o endereço da Vercel.
   - URI de redirecionamento autorizado: `https://kbxggslfrswvjercojfl.supabase.co/auth/v1/callback`
3. Copie o **Client ID** e o **Client Secret** e cole direto no Supabase: **Authentication → Sign In / Providers → Google**. Eles não vão para o `.env`.
4. No Supabase, **Authentication → URL Configuration**: Site URL = endereço da Vercel (depois do deploy; até lá, `http://localhost:3000`). Em Redirect URLs, adicione `http://localhost:3000/**` e `https://SEU-PROJETO.vercel.app/**`.

## 4. Google Maps (mesmo projeto rotaschacara)

O Google Maps exige uma **conta de faturamento com cartão**, mas cada serviço do nível "Essentials" tem cota gratuita mensal (hoje, 10.000 chamadas por serviço por mês). Para 20 pessoas isso sobra muito. Para garantir custo zero, você vai limitar o uso por dia.

1. **Faturamento**: vincule uma conta de faturamento ao projeto.
2. **Alerta de orçamento**: Faturamento → Orçamentos e alertas → orçamento de R$ 1, com alertas em 50% e 100%.
3. **Ative as APIs** (APIs e serviços → Biblioteca): Maps JavaScript API, Places API (New), Geocoding API e, para a fase 2, Routes API.
4. **Limite diário** (APIs e serviços → cada API → Cotas): coloque 300 solicitações por dia em cada uma. 300 × 31 = 9.300, abaixo da cota gratuita.
5. **Duas chaves** (Credenciais → Criar credenciais → Chave de API):
   - `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`: restrição de aplicativo "Sites" (HTTP referrers) com `http://localhost:3000/*` e `https://SEU-PROJETO.vercel.app/*`; restrição de API: Maps JavaScript API e Places API (New).
   - `GOOGLE_MAPS_SERVER_KEY`: sem restrição de aplicativo (a Vercel não tem IP fixo); restrição de API: Geocoding API e Routes API. **Segredo**, só no servidor.

## 5. E-mail de avisos (Gmail)

1. Na conta Google que vai enviar os e-mails, ative a **verificação em duas etapas**.
2. Crie uma **senha de app** (Conta Google → Segurança → Senhas de app), nome "Taverna".
3. Variáveis: `SMTP_USER` (o e-mail) e `SMTP_APP_PASSWORD` (a senha de 16 caracteres, **segredo**).

## 6. Vercel

Passo a passo completo da publicação: `docs/publicar.md`.


1. **Add New → Project → Import** o repositório `GutoMiranda/tavernalobby`. Tente o nome `tavernalobby` (endereço `tavernalobby.vercel.app`, se estiver livre).
2. Em **Settings → Environment Variables**, cadastre as mesmas variáveis do `.env.local`.
3. Depois do primeiro deploy, volte aos passos 3.2, 3.4 e 4.5 e adicione o endereço final da Vercel.

## 7. Pix automático (InfinitePay)

Pix com confirmação automática no Baú. Taxa zero no Pix pelo link. O dinheiro cai na conta InfinitePay de quem é dono da InfiniteTag configurada (não na chave Pix cadastrada no Baú).

1. Instale o app **InfinitePay** e abra a conta (o dono decide se CNPJ/MEI ou CPF; se a conta CPF não liberar o link integrado, use um MEI ou o plano B, Mercado Pago).
2. No app: **Configurações → Checkout → Habilitar checkout integrado** (sem isso a API responde `external_checkout_not_enabled`).
3. Copie sua **InfiniteTag** (aparece como `$seunome`) e grave no `.env.local` **sem o `$`**: `INFINITEPAY_HANDLE=seunome`. Não é senha, mas fica fora do código para só o dono mudar para onde vai o dinheiro.
4. O aviso automático (webhook) só chega quando o site estiver publicado em https (Vercel, seção 6). Rodando no seu PC, o crédito acontece quando a pessoa volta da página de pagamento.
5. Não existe ambiente de teste: teste com um Pix real de R$ 1,00.

## Resumo das variáveis (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
GOOGLE_MAPS_SERVER_KEY=
SMTP_USER=
SMTP_APP_PASSWORD=
ADMIN_EMAIL=guto.miranda90@gmail.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
INFINITEPAY_HANDLE=
```
