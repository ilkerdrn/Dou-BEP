# DOU BEP Sinav Atolyesi v2.4 - first local tenant administrator.
# Password is prompted without terminal echo, not saved to this file.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($node) { $node.Source } else { $null }
if (-not $nodePath) {
  foreach ($candidate in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "$env:LOCALAPPDATA\Programs\nodejs\node.exe")) {
    if (Test-Path -LiteralPath $candidate) { $nodePath = $candidate; break }
  }
}
if (-not $nodePath) { throw 'Node.js bulunamadi. Node.js 22.13 veya uzerini kurun.' }
$tenantId = Read-Host 'Kurum kodu (ornek: demo-kurum)'
$tenantName = Read-Host 'Kurum adi'
$email = Read-Host 'Yonetici e-posta'
$secure = Read-Host 'Guclu parola (en az 14 karakter)' -AsSecureString
$handle = [IntPtr]::Zero
try {
    $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:BEP_BOOTSTRAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
    & $nodePath (Join-Path $PSScriptRoot 'server-foundation/admin-cli.mjs') setup $tenantId $tenantName $email
    if ($LASTEXITCODE -ne 0) { throw 'Kurulum tamamlanamadi' }
} finally {
    Remove-Item Env:BEP_BOOTSTRAP_PASSWORD -ErrorAction SilentlyContinue
    if ($handle -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
}
Write-Host 'Kurum girisi icin BASLAT.bat dosyasini acin ve /kurum sayfasina gidin.'
