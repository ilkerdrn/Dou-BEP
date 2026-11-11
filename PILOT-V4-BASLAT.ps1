# DOU BEP V4: isolated, synthetic-only pilot. Never touches data/institution.sqlite.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pilotDir = Join-Path $PSScriptRoot '.local-pilot-v4'
$db = Join-Path $pilotDir 'pilot.sqlite'
$marker = Join-Path $pilotDir 'pilot-only.marker'
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'tools\pilot-v4-seed.mjs'))) {
    throw 'Pilot kurulum araci bulunamadi. Guncel GitHub dalini cekin.'
}
$node = Get-Command node.exe -ErrorAction Stop
$null = & $node.Source --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js hazir degil.' }

# Never assume an existing SQLite file is ours. The marker is created only after a completed seed.
if ((Test-Path -LiteralPath $db) -xor (Test-Path -LiteralPath $marker)) {
    throw 'Eksik veya tanimsiz pilot dosyasi var. Guvenlik icin dokunulmadi.'
}
if (Test-Path -LiteralPath $marker) {
    if ((Get-Content -LiteralPath $marker -Raw) -notmatch '^DOU-BEP-SYNTHETIC-PILOT-V4') {
        throw 'Bu klasorun bizim pilot kurulumumuz oldugu dogrulanamadi.'
    }
}
# Port is separate from the ordinary 4173 instance. Keep the existing service running.
$env:PORT = '4174'
$env:BEP_DB_PATH = $db
$env:BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL = '1'
$env:BEP_PILOT_ONLY = '1'
try {
    if (-not (Test-Path -LiteralPath $db)) {
        Write-Host '=== SENTETIK PILOT VERILERI OLUSTURULUYOR ===' -ForegroundColor Cyan
        & $node.Source (Join-Path $PSScriptRoot 'tools\pilot-v4-seed.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Pilot veri kurulumu basarisiz; mevcut dosyalara dokunmayin.' }
    } else {
        Write-Host 'Mevcut sentetik pilot veritabani korunuyor. Yeni veri eklenmeyecek.' -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host '=== DOU BEP V4 - YALNIZCA SENTETIK PILOT ===' -ForegroundColor Green
    Write-Host 'Giris : http://127.0.0.1:4174/kurum'
    Write-Host 'Kurum : dou-pilot-v4'
    Write-Host 'Yonetici  : admin@dou-pilot.test'
    Write-Host 'Ogretmen  : ogretmen@dou-pilot.test'
    Write-Host 'Incelemeci: incelemeci@dou-pilot.test'
    Write-Host 'Koordinator: koordinator@dou-pilot.test'
    Write-Host 'TEST SIFRESI (tumu): BEP-Sentetik-Pilot-2026!' -ForegroundColor Yellow
    Write-Host 'Bu bilgiler ASLA gercek ogrenci veya canli ortamda kullanilmamalidir.' -ForegroundColor Yellow
    Write-Host '2 anonim sinav taslagi ogretmen hesabinda. Onay icin ayri incelemeciye gecin.'
    Write-Host 'Kapatmak icin Ctrl+C. Pilot DB kalir; mevcut kurum DB degismez.'
    & $node.Source (Join-Path $PSScriptRoot 'server.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Pilot sunucu baslatilamadi. 4174 portunu kontrol edin.' }
} finally {
    foreach ($key in @('PORT','BEP_DB_PATH','BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL','BEP_PILOT_ONLY')) {
        Remove-Item ('Env:' + $key) -ErrorAction SilentlyContinue
    }
}
