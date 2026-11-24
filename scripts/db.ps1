# Comandos do banco (Supabase CLI) usando a senha guardada no .env.local.
# A senha nunca aparece na tela nem vai para o GitHub.
#
# Uso (no PowerShell, na pasta do projeto):
#   .\scripts\db.ps1 link     # liga a pasta ao projeto do Supabase (uma vez)
#   .\scripts\db.ps1 push     # aplica as migrações novas no banco
#   .\scripts\db.ps1 status   # lista as migrações aplicadas e pendentes
#
# Antes da primeira vez: npm install  e  npx --no-install supabase login

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("link", "push", "status")]
  [string]$Comando
)

$ErrorActionPreference = "Stop"
$ProjectRef = "kbxggslfrswvjercojfl"
$EnvFile = Join-Path $PSScriptRoot "..\.env.local"

if (-not (Test-Path $EnvFile)) {
  Write-Host "Arquivo .env.local não encontrado. Copie o .env.example e preencha (docs/setup.md)." -ForegroundColor Red
  exit 1
}

# Lê só a variável SUPABASE_DB_PASSWORD do .env.local.
$linha = Get-Content $EnvFile | Where-Object { $_ -match '^\s*SUPABASE_DB_PASSWORD\s*=' } | Select-Object -First 1
$senha = if ($linha) { ($linha -split '=', 2)[1].Trim().Trim('"') } else { "" }
if (-not $senha) {
  Write-Host "Preencha SUPABASE_DB_PASSWORD no .env.local (senha do banco do Supabase)." -ForegroundColor Red
  exit 1
}

# A CLI do Supabase lê a senha desta variável de ambiente (só nesta janela).
$env:SUPABASE_DB_PASSWORD = $senha
try {
  switch ($Comando) {
    # --no-install: usa a versão da CLI fixada no package.json (npm install), não a mais nova da internet.
    # --linked: sempre o projeto do Supabase na nuvem, nunca um banco local (Docker).
    "link"   { npx --no-install supabase link --project-ref $ProjectRef }
    "push"   { npx --no-install supabase db push --linked }
    "status" { npx --no-install supabase migration list --linked }
  }
} finally {
  Remove-Item Env:\SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
}
