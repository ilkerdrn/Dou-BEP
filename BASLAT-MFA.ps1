# Offline Windows launch using a DPAPI-protected per-user MFA key.
# The private key is never stored as plaintext on disk or passed as a CLI argument.
param([string]$NodePath = 'node.exe')
$ErrorActionPreference = 'Stop'
$folder = $PSScriptRoot
$keyDir = Join-Path $env:LOCALAPPDATA 'DOU-BEP-LOCAL'
$keyFile = Join-Path $keyDir 'mfa-key.dpapi'
$envName = 'BEP_MFA_KEY'
try {
    if (-not (Test-Path -LiteralPath (Join-Path $folder 'server.mjs'))) {
        throw 'Proje server.mjs dosyasi bulunamadi.'
    }
    if (!(Test-Path -LiteralPath $keyFile)) {
        $dbPath = if ($env:BEP_DB_PATH) { $env:BEP_DB_PATH } else { Join-Path $folder 'data\institution.sqlite' }
        & $NodePath (Join-Path $folder 'tools\mfa-enrolled-check.mjs') $dbPath
        if ($LASTEXITCODE -eq 11) { throw 'MFA kullanan hesaplar var ama eski yerel anahtar bulunamadi. Yeni anahtar uretilmedi. Once anahtari geri yukleyin.' }
        if ($LASTEXITCODE -ne 0) { throw 'MFA veritabani durumu kontrol edilemedi. Anahtar uretilmedi.' }
        [IO.Directory]::CreateDirectory($keyDir) | Out-Null
        $secret = New-Object byte[] 32
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secret)
        $encrypted = [Security.Cryptography.ProtectedData]::Protect(
            $secret, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [IO.File]::WriteAllBytes($keyFile, $encrypted)
        [Array]::Clear($secret, 0, $secret.Length)
        Write-Host 'Windows kullanicisi icin DPAPI korumali MFA anahtari olusturuldu.' -ForegroundColor Green
    }
    $blob = [IO.File]::ReadAllBytes($keyFile)
    $secret = [Security.Cryptography.ProtectedData]::Unprotect(
        $blob, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    if ($secret.Length -ne 32) { throw 'MFA anahtari boyutu gecersiz.' }
    $env:BEP_MFA_KEY = [Convert]::ToBase64String($secret)
    [Array]::Clear($secret, 0, $secret.Length)
    Write-Host 'BEP MFA yerel baslatma modu aktif.' -ForegroundColor Cyan
    Start-Process 'http://127.0.0.1:4173/kurum'
    Push-Location $folder
    try { & $NodePath (Join-Path $folder 'server.mjs') }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Sunucu hata kodu: $LASTEXITCODE" }
}
finally {
    Remove-Item Env:BEP_MFA_KEY -ErrorAction SilentlyContinue
}
