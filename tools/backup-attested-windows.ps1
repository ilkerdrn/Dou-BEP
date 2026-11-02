# DOU BEP local research pilot. Never places the backup passphrase in CLI args.
# Requires PowerShell and Node.js >=22.13. No institutional certification implied.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('backup','restore')][string]$Action,
    [Parameter(Mandatory=$true)][string]$Source,
    [Parameter(Mandatory=$true)][string]$Destination,
    [ValidateSet('single','rotation')][string]$AuditMode='single',
    [string]$KeyFile,
    [string]$EvidenceFile,
    [string]$OldKeyFile,
    [string]$OldEvidenceFile,
    [string]$NewKeyFile,
    [string]$NewEvidenceFile
)
$ErrorActionPreference = 'Stop'
if ($AuditMode -eq 'single' -and (!$KeyFile -or !$EvidenceFile)) {
    throw 'single modu icin KeyFile ve EvidenceFile gerekli.'
}
if ($AuditMode -eq 'rotation' -and (!$OldKeyFile -or !$OldEvidenceFile -or !$NewKeyFile -or !$NewEvidenceFile)) {
    throw 'rotation modu icin eski/yeni anahtar ve kanit dosyalari gerekli.'
}
$program = Join-Path $PSScriptRoot 'attested-backup.mjs'
if (!(Test-Path -LiteralPath $program -PathType Leaf)) { throw 'Korumali yedek aracina ulasilamadi.' }
$pass = Read-Host 'Sifreli yedek parolasini girin (en az 16 karakter)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
try { $env:BEP_BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
try {
    $env:BEP_BACKUP_AUDIT_MODE = $AuditMode
    if ($AuditMode -eq 'single') {
        $env:BEP_AUDIT_KEY_FILE = $KeyFile
        $env:BEP_AUDIT_EVIDENCE_FILE = $EvidenceFile
    } else {
        $env:BEP_AUDIT_OLD_KEY_FILE = $OldKeyFile
        $env:BEP_AUDIT_OLD_EVIDENCE_FILE = $OldEvidenceFile
        $env:BEP_AUDIT_NEW_KEY_FILE = $NewKeyFile
        $env:BEP_AUDIT_NEW_EVIDENCE_FILE = $NewEvidenceFile
    }
    & node $program $Action $Source $Destination
    if ($LASTEXITCODE -ne 0) { throw 'Korumali yedek islemi basarisiz.' }
} finally {
    Remove-Item Env:BEP_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
    Remove-Item Env:BEP_BACKUP_AUDIT_MODE -ErrorAction SilentlyContinue
    foreach ($name in @('BEP_AUDIT_KEY_FILE','BEP_AUDIT_EVIDENCE_FILE','BEP_AUDIT_OLD_KEY_FILE','BEP_AUDIT_OLD_EVIDENCE_FILE','BEP_AUDIT_NEW_KEY_FILE','BEP_AUDIT_NEW_EVIDENCE_FILE')) {
        Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    }
}
