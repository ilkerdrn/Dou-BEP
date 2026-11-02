# Read-only NVDA research smoke test. No installation, no profile modification.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host '=== DOU BEP NVDA YEREL ON TEST ===' -ForegroundColor Cyan
Write-Host 'NVDA ayarlari, ses motoru ve mevcut veritabani degistirilmeyecek.'
& node --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js bulunamadi.' }
$check = @(
  'tools/dou-speech-nvda-stdio.mjs',
  'dou-speech-nvda-bridge.test.mjs',
  'nvda-experimental/synthDrivers/douBepPilot/__init__.py',
  'nvda-experimental/test_driver_lifecycle.py'
)
foreach ($f in $check) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $f) -PathType Leaf)) {
    throw "Eksik kaynak: $f"
  }
}
Write-Host '=== NODE BRIDGE TEST ===' -ForegroundColor Cyan
& node --test dou-speech-nvda-bridge.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'NVDA bridge testi basarisiz.' }
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  Write-Host '=== PYTHON DRIVER TESTLERI ===' -ForegroundColor Cyan
  & py -3 -m unittest discover -s nvda-experimental -p 'test_*.py' -v
  if ($LASTEXITCODE -ne 0) { throw 'NVDA driver mock testi basarisiz.' }
} else {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    & python -m unittest discover -s nvda-experimental -p 'test_*.py' -v
    if ($LASTEXITCODE -ne 0) { throw 'NVDA driver mock testi basarisiz.' }
  } else {
    Write-Warning 'Python bulunamadi; Python mock testleri calistirilamadi.'
  }
}
Write-Host '=== WINDOWS KOSULLARI ===' -ForegroundColor Cyan
$nvda = @(
  (Join-Path $env:ProgramFiles 'NVDA/nvda.exe'),
  (Join-Path $env:ProgramFiles 'NVDA/nvda_slave.exe')
) | Where-Object { Test-Path -LiteralPath $_ }
if ($nvda.Count -gt 0) { Write-Host ('NVDA kurulum izi: ' + $nvda[0]) }
else { Write-Warning 'Standart Program Files konumunda NVDA bulunamadi. Portable NVDA olabilir.' }
Write-Host ('Proje: ' + $root)
Write-Host 'PASS: Sadece otomatik kontroller. Gercek NVDA/WavePlayer ses testi HENUZ YAPILMADI.' -ForegroundColor Green
