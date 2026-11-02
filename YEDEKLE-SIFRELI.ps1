# Offline pilot. Requires Node.js 22.13+. Never process real learner/medical data without institutional approval.
param(
  [ValidateSet('Backup','Verify','Restore')][string]$Action = 'Backup',
  [string]$SourceFile = '',
  [string]$DestinationFile = ''
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$script = Join-Path $root 'tools\secure-backup.mjs'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.13+ bulunamadi.' }
if ($Action -eq 'Restore' -and ([string]::IsNullOrWhiteSpace($SourceFile) -or [string]::IsNullOrWhiteSpace($DestinationFile))) {
  throw 'Restore icin SourceFile (sifreli yedek) ve DestinationFile (YENI sqlite yolu) gerekli.'
}
if ($Action -eq 'Verify' -and [string]::IsNullOrWhiteSpace($SourceFile)) { throw 'Verify icin SourceFile gereklidir.' }
$secret = Read-Host 'En az 16 karakterli sifreli yedek parolasini girin' -AsSecureString
$bstr = [IntPtr]::Zero
try {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $env:BEP_BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ($Action -eq 'Backup') {
    if ($DestinationFile) { & node $script backup $DestinationFile } else { & node $script backup }
  } elseif ($Action -eq 'Verify') {
    & node $script verify $SourceFile
  } else {
    & node $script restore $SourceFile $DestinationFile
  }
  if ($LASTEXITCODE -ne 0) { throw 'Islem basarisiz oldu.' }
} finally {
  Remove-Item Env:\BEP_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $secret.Dispose()
}
