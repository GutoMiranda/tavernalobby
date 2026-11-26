# Publicar o Taverna O Lobby (Vercel grátis)

Endereço gratuito da Vercel (`https://tavernalobby.vercel.app` ou parecido). Um domínio próprio pode ser adicionado depois, sem refazer nada. Tempo estimado: 30 a 40 minutos.

> Segredos: cole as chaves só nos painéis (Vercel, Supabase, Google). Nunca no chat, no GitHub ou na pasta do projeto.

## 0. Banco em dia (PowerShell, na pasta do projeto)

```powershell
git checkout -- package-lock.json
git pull
npm ci
powershell -ExecutionPolicy Bypass -File .\scripts\db.ps1 push
```

O site publicado usa o mesmo banco do Supabase que você já usa no PC.

## 1. Levar o código para a `main`

A Vercel publica o branch `main`. Abra o pull request
https://github.com/GutoMiranda/tavernalobby/pull/1
e clique em **Merge pull request → Confirm merge**.

## 2. Criar o projeto na Vercel

1. Entre em https://vercel.com com **Continue with GitHub** (plano Hobby, grátis).
2. **Add New… → Project**. Na lista, ache `tavernalobby` e clique em **Import**. Se ele não aparecer, clique em **Adjust GitHub App Permissions** e libere o repositório.
3. **Project Name**: `tavernalobby` (se estiver ocupado, a Vercel sugere outro; anote o endereço final).
4. Framework: **Next.js** (já vem detectado). Não mude Build Command nem Output.
5. Abra **Environment Variables**. Abra seu `.env.local` no Bloco de Notas, copie tudo e cole no primeiro campo **Key**: a Vercel separa as variáveis sozinha. Depois:
   - **Apague** `SUPABASE_DB_PASSWORD` (só serve para o PowerShell).
   - Troque `NEXT_PUBLIC_SITE_URL` para `https://tavernalobby.vercel.app` (ou o endereço que a Vercel mostrar).
6. Clique em **Deploy** e espere uns 2 minutos. No fim aparece **Congratulations** e o endereço do site.

Se o endereço final for diferente do que você colocou em `NEXT_PUBLIC_SITE_URL`: **Settings → Environment Variables**, corrija, e depois **Deployments → ⋯ no mais recente → Redeploy**.

## 3. Supabase: avisar o endereço novo

Supabase → projeto `kbxggslfrswvjercojfl` → **Authentication → URL Configuration**:

- **Site URL**: `https://tavernalobby.vercel.app`
- **Redirect URLs → Add URL**: `https://tavernalobby.vercel.app/**` (mantenha o `http://localhost:3000/**` para continuar testando no PC).
- **Save**.

## 4. Google Cloud (projeto `rotaschacara`)

1. **APIs e serviços → Credenciais → seu ID do cliente OAuth (Web)**:
   - **Origens JavaScript autorizadas → Adicionar URI**: `https://tavernalobby.vercel.app`
   - Não mexa no URI de redirecionamento (continua o do Supabase). **Salvar**.
2. **Tela de consentimento OAuth** (ou "Google Auth Platform → Branding"):
   - Página inicial: `https://tavernalobby.vercel.app`
   - Política de privacidade: `https://tavernalobby.vercel.app/privacidade`
   - Termos de serviço: `https://tavernalobby.vercel.app/termos`
   - Domínios autorizados (se pedir): `tavernalobby.vercel.app` e `kbxggslfrswvjercojfl.supabase.co`. **Salvar**.
3. **Público-alvo → Publicar app → Confirmar**. O status vira **Em produção**: qualquer conta Google do grupo entra (com escopos básicos não há revisão do Google). Até isso, só os "usuários de teste" conseguem entrar.
4. **Chave do Maps para o navegador** (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`) → Restrições de aplicativo → Sites → **Adicionar**: `https://tavernalobby.vercel.app/*`. **Salvar**. Sem isso o mapa fica cinza no site publicado.

## 5. Testar no celular

1. Abra `https://tavernalobby.vercel.app` no celular, **Entrar com Google**.
2. Abra uma aventura: mapa, estalagens (km e tempo de carro), custos.
3. **Pix de R$ 1,00** pelo Baú: agora o aviso automático da InfinitePay chega pelo endereço https (não precisa configurar nada no app da InfinitePay; o site manda o endereço em cada cobrança). O depósito deve confirmar sozinho em segundos.
4. No celular, **Adicionar à tela inicial** instala como app (ícone da caneca).
5. Mande o link de convite (Salão do Mestre → Membros) para o grupo.

## Bom saber

- **Atualizações**: cada merge na `main` publica sozinho em 1 a 2 minutos.
- **Custo zero**: Vercel Hobby e Supabase Free bastam para 20 pessoas. O Supabase Free pausa o banco depois de 7 dias **sem nenhum acesso**; se acontecer, é só entrar no painel e clicar em **Restore**.
- **Domínio próprio** (ex.: `tavernaolobby.com.br`, uns R$ 40 por ano no registro.br): Vercel → Settings → Domains → Add, e depois repetir os passos 3 e 4 com o domínio novo.
