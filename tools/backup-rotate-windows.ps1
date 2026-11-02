# Local-only Windows helper: prompt invisibly, never pass secrets as CLI arguments.
# Old encrypted archive is preserved; a NEW destination is required.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Source,
    [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
function Convert-Secret([System.Security.SecureString]$Secret) {
    $handle = [IntPtr]::Zero
    try {
        $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
    } finally {
        if ($handle -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
    }
}
$first = $null
$second = $null
try {
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw 'Kaynak yedek dosyasi bulunamadi.' }
    if (Test-Path -LiteralPath $Destination) { throw 'Yeni hedef zaten mevcut; eski yedek veya diger dosya uzerine yazilmaz.' }
    $first = Read-Host 'Eski yedek parolasi' -AsSecureString
    $second = Read-Host 'Yeni yedek parolasi' -AsSecureString
    $env:BEP_BACKUP_PASSPHRASE = Convert-Secret $first
    $env:BEP_BACKUP_NEW_PASSPHRASE = Convert-Secret $second
    & node.exe (Join-Path $PSScriptRoot 'secure-backup.mjs') rotate $Source $Destination
    if ($LASTEXITCODE -ne 0) { throw 'Parola yenileme basarisiz. Eski yedek degismedi.' }
} finally {
    Remove-Item Env:BEP_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
    Remove-Item Env:BEP_BACKUP_NEW_PASSPHRASE -ErrorAction SilentlyContinue
    if ($first -ne $null) { $first.Dispose() }
    if ($second -ne $null) { $second.Dispose() }
}
