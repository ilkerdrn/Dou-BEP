# DOU BEP: ephemeral, offline recovery rehearsal (research pilot only).
# Backed up and restored data are kept within a transient local test folder and removed.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$Source,
 [ValidateSet('single','rotation')][string]$AuditMode='single',
 [string]$KeyFile,
 [string]$EvidenceFile,
 [string]$OldKeyFile,
 [string]$OldEvidenceFile,
 [string]$NewKeyFile,
 [string]$NewEvidenceFile
)
$ErrorActionPreference='Stop'
if ($AuditMode -eq 'single' -and (!$KeyFile -or !$EvidenceFile)) { throw 'single modunda KeyFile ve EvidenceFile gerekli.' }
if ($AuditMode -eq 'rotation' -and (!$OldKeyFile -or !$OldEvidenceFile -or !$NewKeyFile -or !$NewEvidenceFile)) { throw 'rotation modunda eski/yeni anahtar ve kanit gerekli.' }
$script = Join-Path $PSScriptRoot 'storage-recovery-drill.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Kurtarma provasi araci bulunamadi.' }
$pass=Read-Host 'Yedek parolasini girin (en az 16 karakter)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
try { $env:BEP_BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
try {
 $env:BEP_BACKUP_AUDIT_MODE=$AuditMode
 if ($AuditMode -eq 'single') {
  $env:BEP_AUDIT_KEY_FILE=$KeyFile
  $env:BEP_AUDIT_EVIDENCE_FILE=$EvidenceFile
 } else {
  $env:BEP_AUDIT_OLD_KEY_FILE=$OldKeyFile
  $env:BEP_AUDIT_OLD_EVIDENCE_FILE=$OldEvidenceFile
  $env:BEP_AUDIT_NEW_KEY_FILE=$NewKeyFile
  $env:BEP_AUDIT_NEW_EVIDENCE_FILE=$NewEvidenceFile
 }
 & node $script $Source
 if ($LASTEXITCODE -ne 0) { throw 'Kurtarma provasi basarisiz.' }
} finally {
 Remove-Item Env:BEP_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
 Remove-Item Env:BEP_BACKUP_AUDIT_MODE -ErrorAction SilentlyContinue
 foreach ($name in @('BEP_AUDIT_KEY_FILE','BEP_AUDIT_EVIDENCE_FILE','BEP_AUDIT_OLD_KEY_FILE','BEP_AUDIT_OLD_EVIDENCE_FILE','BEP_AUDIT_NEW_KEY_FILE','BEP_AUDIT_NEW_EVIDENCE_FILE')) {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
 }
}
