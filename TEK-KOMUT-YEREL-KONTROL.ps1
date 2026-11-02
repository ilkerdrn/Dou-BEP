# DOU BEP v2.24 -- run inside this extracted project directory.
# Does not install packages, download external resources or delete existing data.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root
try {
    Write-Host "`n=== DOU BEP v2.24 LOCAL KONTROL ===" -ForegroundColor Cyan
    if (-not (Test-Path -LiteralPath (Join-Path $root 'server.mjs') -PathType Leaf)) { throw 'server.mjs bulunamadi.' }
    $nodeVersion = & node --version
    if ($LASTEXITCODE -ne 0) { throw 'Node.js bulunamadi. Node.js 22.13+ gerekiyor.' }
    Write-Host "Node.js: $nodeVersion"
    Write-Host 'Mevcut data klasoru silinmeyecek ve degistirilmeyecek.' -ForegroundColor Yellow
    & node --check server.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Server syntax FAILED.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'npm test FAILED.' }
    & npm.cmd run release:check
    if ($LASTEXITCODE -ne 0) { throw 'release:check FAILED.' }
    & npm.cmd run offline:audit
    if ($LASTEXITCODE -ne 0) { throw 'offline:audit FAILED.' }
    Write-Host "`nTEST KONTROLLERI TAMAMLANDI." -ForegroundColor Green
    Write-Host 'Paneli acmak icin proje klasorundeki BASLAT.bat dosyasini calistirin.'
    Write-Host 'Kurum giris adresi: http://127.0.0.1:4173/kurum'
    Write-Host 'Operasyon Merkezi: http://127.0.0.1:4173/sinav-operasyon'
    Write-Host 'Gercek ogrenci veya saglik verilerini yuklemeyin.' -ForegroundColor Yellow
} finally { Pop-Location }
