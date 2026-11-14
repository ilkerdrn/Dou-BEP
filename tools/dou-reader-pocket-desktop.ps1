# DOU Pocket TTS offline native desktop lab (Windows, isolated virtualenv).
# Read-only by default. -Start explicitly opens the GUI.
[CmdletBinding()]
param(
 [switch]$Start,
 [string]$LabPath = 'D:\DOU-POCKET-TTS-LAB'
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
 throw 'DOU Pocket Desktop requires Windows.'
}
if ($LabPath -notmatch '^[A-Za-z]:\\' -or $LabPath -match '[\x00-\x1F]') {
 throw 'Use a local absolute Windows drive path.'
}
$python = Join-Path $LabPath '.venv\Scripts\python.exe'
$script = Join-Path $PSScriptRoot 'dou_reader_pocket_desktop.py'
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
 throw 'Pocket TTS isolated Python runtime missing. Existing lab setup is required.'
}
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) {
 throw 'DOU Pocket Desktop Python source is missing.'
}
$oldOffline = [Environment]::GetEnvironmentVariable('HF_HUB_OFFLINE','Process')
$oldTransformers = [Environment]::GetEnvironmentVariable('TRANSFORMERS_OFFLINE','Process')
$oldTelemetry = [Environment]::GetEnvironmentVariable('HF_HUB_DISABLE_TELEMETRY','Process')
$oldPythonEncoding = [Environment]::GetEnvironmentVariable('PYTHONIOENCODING','Process')
try {
 $env:HF_HUB_OFFLINE = '1'
 $env:TRANSFORMERS_OFFLINE = '1'
 $env:HF_HUB_DISABLE_TELEMETRY = '1'
 $env:PYTHONIOENCODING = 'utf-8'
 Write-Host 'DOU POCKET DESKTOP: strict local model/cache; no server or download.' -ForegroundColor Cyan
 if (-not $Start) {
  & $python $script '--check'
  if ($LASTEXITCODE -ne 0) { throw 'Local Pocket Desktop readiness check failed.' }
  return
 }
 Write-Host 'Experimental native window; anonymous text only. No exam data.' -ForegroundColor Yellow
 & $python $script '--gui'
 if ($LASTEXITCODE -ne 0) { throw 'Pocket Desktop exited with an error.' }
} finally {
 if ($null -eq $oldOffline) { Remove-Item Env:HF_HUB_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:HF_HUB_OFFLINE = $oldOffline }
 if ($null -eq $oldTransformers) { Remove-Item Env:TRANSFORMERS_OFFLINE -ErrorAction SilentlyContinue }
 else { $env:TRANSFORMERS_OFFLINE = $oldTransformers }
 if ($null -eq $oldTelemetry) { Remove-Item Env:HF_HUB_DISABLE_TELEMETRY -ErrorAction SilentlyContinue }
 else { $env:HF_HUB_DISABLE_TELEMETRY = $oldTelemetry }
 if ($null -eq $oldPythonEncoding) { Remove-Item Env:PYTHONIOENCODING -ErrorAction SilentlyContinue }
 else { $env:PYTHONIOENCODING = $oldPythonEncoding }
}
