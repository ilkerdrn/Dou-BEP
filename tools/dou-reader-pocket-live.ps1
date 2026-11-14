# DOU Reader: separately opted-in, fully local Pocket TTS Turkish research.
# Reads ONE anonymous prompt interactively. No exam integration, cloud API or cloning.
# Defaults to a read-only readiness check. Does not download models or pip packages.
[CmdletBinding()]
param(
 [switch]$Speak,
 [switch]$Play,
 [ValidateSet('female_1','female_2','female_3','male_1','male_2','male_3')]
 [string]$Voice = 'female_2',
 [ValidateSet('sakin','mutlu','uzgun','kizgin','saskin')]
 [string]$Emotion = 'sakin',
 [string]$LabPath = 'D:\DOU-POCKET-TTS-LAB'
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
 throw 'Pocket live speech lab requires Windows.'
}
if ($Play -and -not $Speak) { throw '-Play requires -Speak.' }
if ($LabPath -notmatch '^[A-Za-z]:\\' -or $LabPath -match '[\x00-\x1F]') {
 throw 'Use a local absolute Windows drive path.'
}
$cliExe = Join-Path $LabPath '.venv\Scripts\pocket-tts-turkish.exe'
if (-not (Test-Path -LiteralPath $cliExe -PathType Leaf)) {
 Write-Host 'DOU POCKET LIVE: NOT READY - install the isolated model package first.' -ForegroundColor Yellow
 Write-Host 'See tools/dou-reader-pocket-tts.ps1 -Setup (third-party install; permission required).'
 if ($Speak) { throw 'Cannot synthesize: local Pocket TTS installation is missing.' }
 return
}
Write-Host 'DOU POCKET LIVE: PACKAGE DETECTED. Offline cached model required.' -ForegroundColor Green
Write-Host 'Experimental, not institutional/production approved. No exam or student data.'
if (-not $Speak) {
 Write-Host 'Read-only check finished. Use -Speak to enter an anonymous sample.'
 return
}
# Read-Host keeps the phrase out of shell history and process command arguments.
# It may still be visible on the local screen; enter synthetic text only.
Write-Host 'Kisisel veri, ogrenci bilgisi, gercek sinav sorusu veya gizli metin GIRMEYIN.' -ForegroundColor Yellow
$text = (Read-Host 'Sadece anonim Turkce deneme cumlesi (5-220 karakter)').Trim()
if ($text.Length -lt 5 -or $text.Length -gt 220 -or $text -match '[\r\n\x00-\x1F]') {
 throw 'Only one short anonymous test phrase (5-220 characters) is allowed.'
}
# A coarse additional safety check; never a substitute for human data review.
if ($text -match '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' -or
    $text -match '(?<!\d)\d{11}(?!\d)') {
 throw 'Possible identifying information found. Enter only a synthetic example.'
}
$outDir = Join-Path $LabPath 'manual-samples'
if (-not (Test-Path -LiteralPath $outDir -PathType Container)) {
 New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$suffix = [guid]::NewGuid().ToString('N').Substring(0,8)
$outputPath = Join-Path $outDir ('DOU-Pocket-Live-'+$Voice+'-'+$stamp+'-'+$suffix+'.wav')
if (Test-Path -LiteralPath $outputPath) { throw 'Refusing to overwrite an existing WAV.' }
$oldOffline = [Environment]::GetEnvironmentVariable('HF_HUB_OFFLINE','Process')
$oldTransformers = [Environment]::GetEnvironmentVariable('TRANSFORMERS_OFFLINE','Process')
$oldTelemetry = [Environment]::GetEnvironmentVariable('HF_HUB_DISABLE_TELEMETRY','Process')
$oldPythonEncoding = [Environment]::GetEnvironmentVariable('PYTHONIOENCODING','Process')
$oldOutputEncoding = $OutputEncoding
try {
 $env:HF_HUB_OFFLINE = '1'
 $env:TRANSFORMERS_OFFLINE = '1'
 $env:HF_HUB_DISABLE_TELEMETRY = '1'
 $env:PYTHONIOENCODING = 'utf-8'
 $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
 # Upstream library accepts Turkish names or these exact English aliases.
 $modelEmotion = @{sakin='calm';mutlu='happy';uzgun='sad';kizgin='angry';saskin='surprised'}[$Emotion]
 Write-Host ('Offline neural synthesis: '+$Voice+', '+$Emotion) -ForegroundColor Cyan
 # Upstream CLI: --text-file - reads STDIN. Never pass user text as a process argument.
 $text | & $cliExe 'generate' '--text-file' '-' '--voice' $Voice '--emotion' $modelEmotion '-o' $outputPath
 if ($LASTEXITCODE -ne 0) { throw 'Offline synthesis failed. Verify model cache and local environment.' }
 if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
  throw 'Offline synthesis returned without creating a WAV.'
 }
 $wav = Get-Item -LiteralPath $outputPath
 if ($wav.Length -lt 2048 -or $wav.Length -gt 2097152) {
  throw 'WAV output exceeds the current demo preview size limit (2 MB).'
 }
 $head = [byte[]]::new(36)
 $stream = [System.IO.File]::OpenRead($outputPath)
 try { [void]$stream.Read($head,0,36) } finally { $stream.Dispose() }
 if ([Text.Encoding]::ASCII.GetString($head,0,4) -cne 'RIFF' -or
     [Text.Encoding]::ASCII.GetString($head,8,4) -cne 'WAVE' -or
     [Text.Encoding]::ASCII.GetString($head,12,4) -cne 'fmt ' -or
     [BitConverter]::ToUInt16($head,20) -ne 1 -or
     [BitConverter]::ToUInt16($head,22) -ne 1 -or
     [BitConverter]::ToUInt32($head,24) -ne 24000 -or
     [BitConverter]::ToUInt16($head,34) -ne 16) {
  throw 'Generated audio is not 24kHz PCM16 mono RIFF WAV.'
 }
 Write-Host ('Local natural Turkish WAV: ' + $outputPath) -ForegroundColor Green
 Write-Host 'No source text file written; WAV remains on this PC until you delete it.'
 if ($Play) {
  Start-Process -FilePath $outputPath
 }
} finally {
 if ($null -eq $oldOffline) { Remove-Item Env:HF_HUB_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:HF_HUB_OFFLINE = $oldOffline }
 if ($null -eq $oldTransformers) { Remove-Item Env:TRANSFORMERS_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:TRANSFORMERS_OFFLINE = $oldTransformers }
 if ($null -eq $oldTelemetry) { Remove-Item Env:HF_HUB_DISABLE_TELEMETRY -ErrorAction SilentlyContinue }
 else { $env:HF_HUB_DISABLE_TELEMETRY = $oldTelemetry }
 if ($null -eq $oldPythonEncoding) { Remove-Item Env:PYTHONIOENCODING -ErrorAction SilentlyContinue }
 else { $env:PYTHONIOENCODING = $oldPythonEncoding }
 $OutputEncoding = $oldOutputEncoding
 $text = $null
}
