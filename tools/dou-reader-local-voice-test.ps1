# DOU Reader OS — independent experimental voice smoke test; does not change installed reader.
[CmdletBinding()]
param([string]$Text='Merhaba dunya')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$bridge=Join-Path $root 'tools\dou-speech-nvda-stdio.mjs'
if (-not (Test-Path -LiteralPath $bridge)) { throw 'Yerel ses motoru bulunamadi.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node gerekli.' }
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows gereklidir.' }
if ($Text.Length -gt 200 -or $Text -notmatch '^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9 .,!?;:\-]+$') { throw 'Bu pilotta kisa sentetik Turkce metin kullanin.' }
$tmp=Join-Path $env:TEMP ('dou-reader-test-'+[guid]::NewGuid().ToString('N')+'.wav')
$p=$null
try {
  $p=New-Object System.Diagnostics.Process
  $p.StartInfo.FileName='node'
  $p.StartInfo.Arguments='"'+$bridge+'"'
  $p.StartInfo.UseShellExecute=$false
  $p.StartInfo.CreateNoWindow=$true
  $p.StartInfo.RedirectStandardInput=$true
  $p.StartInfo.RedirectStandardOutput=$true
  $p.StartInfo.RedirectStandardError=$true
  [void]$p.Start()
  $json=ConvertTo-Json -Compress -InputObject @{text=$Text;acousticModel='legacy'}
  $bytes=[System.Text.Encoding]::UTF8.GetBytes($json)
  $p.StandardInput.BaseStream.Write($bytes,0,$bytes.Length)
  $p.StandardInput.Close()
  $out=[IO.File]::Open($tmp,[IO.FileMode]::CreateNew)
  try { $p.StandardOutput.BaseStream.CopyTo($out) } finally { $out.Dispose() }
  if (-not $p.WaitForExit(15000)) { try {$p.Kill()} catch {};throw 'Yerel motor zaman asimi.' }
  if ($p.ExitCode -ne 0) { throw 'Yerel motor bu metni kabul etmedi.' }
  $wave=[IO.File]::ReadAllBytes($tmp)
  if ($wave.Length -lt 44 -or [Text.Encoding]::ASCII.GetString($wave,0,4) -ne 'RIFF') { throw 'Gecersiz WAV.' }
  $player=New-Object System.Media.SoundPlayer($tmp)
  $player.Load()
  Write-Host 'DOU Reader OS — kendi yerel ses motoru deneniyor.' -ForegroundColor Cyan
  $player.PlaySync()
  Write-Host 'Yerel WAV oynatimi tamamlandi (sesin anlasilirligi ayrica degerlendirilmeli).' -ForegroundColor Green
} finally {
  if ($p) {if (-not $p.HasExited) {try {$p.Kill()}catch{}};$p.Dispose()}
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
