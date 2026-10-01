param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$websiteWorkspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $websiteWorkspace
$websitePostgres = 'C:\Program Files\PostgreSQL\17\bin'
$websiteData = Join-Path $websiteWorkspace 'scratch\website-pg'
$websiteLog = Join-Path $websiteWorkspace 'scratch\website-postgres.log'
if (!(Test-Path -LiteralPath (Join-Path $websitePostgres 'pg_ctl.exe'))) { throw 'Instala PostgreSQL 17 o ajusta websitePostgres a tu instalación local.' }
New-Item -ItemType Directory -Force -Path (Join-Path $websiteWorkspace 'scratch') | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $websiteData 'PG_VERSION'))) {
  & "$websitePostgres\initdb.exe" -D $websiteData -U websiteqa --auth=trust --encoding=UTF8
  if ($LASTEXITCODE) { throw 'No se pudo inicializar el cluster local de QA.' }
}
& "$websitePostgres\pg_ctl.exe" -D $websiteData status *> $null
if ($LASTEXITCODE -ne 0) {
  & "$websitePostgres\pg_ctl.exe" -D $websiteData -l $websiteLog -o '-p 55439 -h 127.0.0.1' -w start
  if ($LASTEXITCODE) { throw 'No se pudo iniciar PostgreSQL local en 127.0.0.1:55439.' }
}
$websiteExists = & "$websitePostgres\psql.exe" -h 127.0.0.1 -p 55439 -U websiteqa -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='websiteqa'"
if ($LASTEXITCODE) { throw 'No se pudo comprobar la base local de QA.' }
if (([string]$websiteExists).Trim() -ne '1') {
  & "$websitePostgres\createdb.exe" -h 127.0.0.1 -p 55439 -U websiteqa websiteqa
  if ($LASTEXITCODE) { throw 'No se pudo crear websiteqa.' }
}
& node node_modules/tsx/dist/cli.mjs scripts/prepare-websites-local.ts
if ($LASTEXITCODE) { throw 'No se pudo preparar el esquema y los fixtures locales.' }
if (!$PrepareOnly) { & node scripts/dev-websites-local.mjs }
