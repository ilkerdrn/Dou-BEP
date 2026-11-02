# DOU BEP isolated, disposable local demo; never accesses production database.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.13+ gerekli.' }
if (-not (Test-Path (Join-Path $root 'tools/demo-seed.mjs'))) { throw 'Demo seed bulunamadi.' }
$demoDir = Join-Path $root 'data'
New-Item -ItemType Directory -Force -Path $demoDir | Out-Null
$dbFile = Join-Path $demoDir ('demo-' + [guid]::NewGuid().ToString('N') + '.sqlite')
$bytes = New-Object byte[] 24
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$password = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$env:BEP_DB_PATH = $dbFile
$env:BEP_DEMO_PASSWORD = $password
$env:BEP_DEMO_LOCAL_ONLY = '1'
$env:PORT = '4174'
try {
    & node tools/demo-seed.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Demo hesaplari olusturulamadi.' }
    Remove-Item Env:BEP_DEMO_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:BEP_DEMO_LOCAL_ONLY -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Host '=== YALNIZCA YEREL DEMO ===' -ForegroundColor Green
    Write-Host 'Adres: http://127.0.0.1:4174/kurum'
    Write-Host 'Kurum: dou-demo'
    Write-Host 'Yonetici: admin@demo.test'
    Write-Host 'Ogretmen: ogretmen@demo.test'
    Write-Host 'Koordinator: koordinator@demo.test'
    Write-Host 'Incelemeci: incelemeci@demo.test'
    Write-Host 'Gozlemci: gozlemci@demo.test'
    Write-Host ('Tum demo hesaplari icin parola: ' + $password)
    Write-Host 'Yeni baslatmada yeni izole demo hesabi olusturulur.'
    Write-Host 'Sunucuyu durdurmak icin Ctrl+C.'
    Start-Process 'http://127.0.0.1:4174/kurum'
    & node server.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Demo sunucusu baslatilamadi. Port 4174 kontrol edilmeli.' }
} finally {
    Remove-Item Env:BEP_DEMO_PASSWORD,Env:BEP_DEMO_LOCAL_ONLY,Env:BEP_DB_PATH,Env:PORT -ErrorAction SilentlyContinue
}
