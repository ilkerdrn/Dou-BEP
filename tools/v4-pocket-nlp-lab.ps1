# Run an isolated, synthetic-only NLP lab with a user's installed Pocket TTS CLI.
# Never changes production configuration or installs models.
[CmdletBinding()]
param(
  [string]$PocketCli = 'D:\DOU-POCKET-TTS-LAB\.venv\Scripts\pocket-tts-turkish.exe'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cli = [System.IO.Path]::GetFullPath($PocketCli)
if (-not [System.IO.Path]::IsPathRooted($PocketCli) -or
    -not (Test-Path -LiteralPath $cli -PathType Leaf)) {
  throw 'Pocket TTS yerel calistirici bulunamadi. Model yuklemesi veya indirme yapilmadi.'
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'tools\v4-nvda-manual-lab.mjs') -PathType Leaf)) {
  throw 'Sentetik NLP laboratuvar araci bulunamadi.'
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw 'Node.js bulunamadi.'
}
$vars = @('BEP_PILOT_ONLY','BEP_PILOT_CLASSIC_SAMPLE',
          'BEP_POCKET_TTS_EXPERIMENT','BEP_POCKET_TTS_RESEARCH_ACK',
          'BEP_POCKET_TTS_CLI')
$old = @{}
foreach ($name in $vars) {
  $old[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
  $env:BEP_PILOT_ONLY='1'
  $env:BEP_PILOT_CLASSIC_SAMPLE='1'
  $env:BEP_POCKET_TTS_EXPERIMENT='1'
  $env:BEP_POCKET_TTS_RESEARCH_ACK='1'
  $env:BEP_POCKET_TTS_CLI=$cli
  Write-Host '=== DOU POCKET TTS — SADECE SENTETIK NLP LABORATUVARI ===' -ForegroundColor Cyan
  Write-Host ('Yerel CLI: ' + $cli)
  Write-Host 'Gercek sinav acilmaz. Model otomatik indirilmez; yerel bagimliliklar zorunludur.'
  Write-Host 'Tarayici sinavini acin; sadece sentetik sorularda Pocket TTS secin.'
  Write-Host 'CLI generate parametrelerini desteklemiyorsa seslendirme hata verir; sinav devam eder.'
  Push-Location $root
  try {
    & node.exe 'tools/v4-nvda-manual-lab.mjs' '--nlp'
    if ($LASTEXITCODE -ne 0) { throw ('Sentetik lab hatasi: ' + $LASTEXITCODE) }
  } finally { Pop-Location }
} finally {
  foreach ($name in $vars) {
    [Environment]::SetEnvironmentVariable($name, $old[$name], 'Process')
  }
}
