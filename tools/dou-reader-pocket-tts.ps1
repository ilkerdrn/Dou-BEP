# Read-only by default; explicit local Pocket TTS research setup and sample.
# Experimental fixed sample only; no exam text, student data or voice cloning.
[CmdletBinding()]
param(
 [switch]$Setup,
 [switch]$Generate,
 [switch]$AllowModelDownload,
 [ValidateSet('female_1','female_2','female_3','male_1','male_2','male_3')]
 [string]$Voice = 'female_2',
 [string]$LabPath = 'D:\DOU-POCKET-TTS-LAB'
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
 throw 'This research helper requires Windows.'
}
if ($AllowModelDownload -and -not $Generate) {
 throw '-AllowModelDownload requires -Generate.'
}
if ($LabPath -notmatch '^[A-Za-z]:\\' -or $LabPath -match '[\x00-\x1F]') {
 throw 'Use a local absolute Windows drive path.'
}
$venvPath = Join-Path $LabPath '.venv'
$pythonExe = Join-Path $venvPath 'Scripts\python.exe'
$cliExe = Join-Path $venvPath 'Scripts\pocket-tts-turkish.exe'
$samplePath = Join-Path (Split-Path -Parent $PSScriptRoot) 'reader-speech-research\POCKET-TTS-FIXED-EXAMPLE-TR001.txt'
$outputPath = Join-Path $LabPath ('DOU-PocketTTS-TR001-'+$Voice+'.wav')

function Require-Managed-Python {
 $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
 if ($null -eq $launcher) {
  throw 'Python launcher py.exe not found. Install Python 3.11 x64 from python.org first.'
 }
 foreach ($version in @('-3.11','-3.12','-3.10')) {
  & $launcher.Source $version -c 'import sys; assert sys.version_info[:2] >= (3,10); print(sys.executable)' 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { return @($launcher.Source,$version) }
 }
 throw 'A compatible Python 3.10, 3.11, or 3.12 runtime is required.'
}
if ($Setup) {
 Write-Host 'Installing external packages in an isolated virtual environment (network required).' -ForegroundColor Yellow
 Write-Host 'Only proceed if your organization permits installing third-party Python packages.'
 if (-not (Test-Path -LiteralPath $LabPath -PathType Container)) {
  New-Item -ItemType Directory -Path $LabPath -Force | Out-Null
 }
 if (-not (Test-Path -LiteralPath $pythonExe -PathType Leaf)) {
  $launch = Require-Managed-Python
  & $launch[0] $launch[1] -m venv $venvPath
  if ($LASTEXITCODE -ne 0) { throw 'Python virtual environment creation failed.' }
 }
 & $pythonExe -m pip install --disable-pip-version-check pocket-tts-turkish
 if ($LASTEXITCODE -ne 0) { throw 'Pocket TTS package installation failed.' }
 Write-Host 'Research environment installed. Model weights have not necessarily been downloaded.'
}
$installed = (Test-Path -LiteralPath $pythonExe -PathType Leaf) -and
 (Test-Path -LiteralPath $cliExe -PathType Leaf)
if (-not $installed) {
 Write-Host 'DOU POCKET TTS: NOT READY — local Python package is absent.' -ForegroundColor Yellow
 Write-Host 'Use -Setup to explicitly install a separate Python research environment.'
 return
}
Write-Host 'DOU POCKET TTS: LOCAL PACKAGE DETECTED' -ForegroundColor Green
Write-Host 'No production Reader integration, speaker cloning or license approval.'
if (-not $Generate) {
 Write-Host 'Model inference was not started. Use -Generate for a fixed anonymous sample.'
 return
}
if (-not (Test-Path -LiteralPath $samplePath -PathType Leaf)) {
 throw 'Fixed public test phrase is missing.'
}
$text = (Get-Content -LiteralPath $samplePath -Encoding UTF8 -Raw).Trim()
if ($text.Length -lt 16 -or $text.Length -gt 250) {
 throw 'Unexpected fixed sample text.'
}
if (Test-Path -LiteralPath $outputPath) {
 throw 'Sample WAV already exists. Refusing to overwrite.'
}
$priorOffline = [Environment]::GetEnvironmentVariable('HF_HUB_OFFLINE','Process')
$priorTransformer = [Environment]::GetEnvironmentVariable('TRANSFORMERS_OFFLINE','Process')
try {
 if (-not $AllowModelDownload) {
  $env:HF_HUB_OFFLINE = '1'
  $env:TRANSFORMERS_OFFLINE = '1'
  Write-Host 'Offline-only inference requested. If model is uncached, it may fail.'
 } else {
  Remove-Item Env:HF_HUB_OFFLINE -ErrorAction SilentlyContinue
  Remove-Item Env:TRANSFORMERS_OFFLINE -ErrorAction SilentlyContinue
  Write-Host 'You explicitly enabled downloading public model weights on first run.' -ForegroundColor Yellow
 }
 & $cliExe 'generate' '--text' $text '--voice' $Voice '--emotion' 'sakin' '-o' $outputPath
 if ($LASTEXITCODE -ne 0) { throw 'Neural voice sample inference failed.' }
 if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) { throw 'No local WAV file was generated.' }
 $wav = Get-Item -LiteralPath $outputPath
 if ($wav.Length -lt 2048 -or $wav.Length -gt 2097152) {
  throw 'WAV output size is outside the research sample bounds.'
 }
 $head = [byte[]]::new(12)
 $stream = [System.IO.File]::OpenRead($outputPath)
 try { [void]$stream.Read($head,0,12) } finally { $stream.Dispose() }
 if ([Text.Encoding]::ASCII.GetString($head,0,4) -cne 'RIFF' -or
     [Text.Encoding]::ASCII.GetString($head,8,4) -cne 'WAVE') {
  throw 'Output is not a RIFF WAVE file.'
 }
 Write-Host ('Experimental local voice sample created: ' + $outputPath) -ForegroundColor Green
 Write-Host 'This does not prove intelligibility or institutional usage rights.'
} finally {
 if ($null -eq $priorOffline) { Remove-Item Env:HF_HUB_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:HF_HUB_OFFLINE = $priorOffline }
 if ($null -eq $priorTransformer) { Remove-Item Env:TRANSFORMERS_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:TRANSFORMERS_OFFLINE = $priorTransformer }
}
