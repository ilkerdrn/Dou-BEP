# DOU Reader - single-folder local Turkish neural voice research helper.
# Read-only by default. Native Piper execution needs explicit -Play -RightsReviewed.
# This script never downloads/installs a model and never reads exam/student text.
[CmdletBinding()]
param(
    [string]$BundlePath = 'D:\DOU-PIPER-LAB',
    [switch]$Play,
    [switch]$RightsReviewed,
    [ValidateSet('TR001','TR004','TR005','TR007','TR009','TR010','TR013','TR014','TR017','TR018','TR021','TR023')]
    [string]$PromptId = 'TR001'
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 is required.'
}
if ($Play -and -not $RightsReviewed) {
    throw 'A license/provenance review is required. -RightsReviewed is not proof of rights.'
}
if ($Play -and [Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'Use powershell.exe -NoProfile -STA for optional listening.'
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $node) { throw 'Node.js is required.' }
$check = Join-Path $PSScriptRoot 'dou-reader-neural-readiness.mjs'
$lab = Join-Path $PSScriptRoot 'dou-piper-windows-listening-lab.ps1'
if (-not (Test-Path -LiteralPath $check -PathType Leaf) -or
    -not (Test-Path -LiteralPath $lab -PathType Leaf)) {
    throw 'Local research scripts are missing.'
}
$raw = & $node.Source $check '--bundle' $BundlePath
if ($LASTEXITCODE -ne 0) { throw 'Read-only candidate check failed.' }
$state = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
if ($state.candidateDetected -ne $true) {
    Write-Host 'DOU READER NEURAL: NOT READY' -ForegroundColor Yellow
    Write-Host ('Reason: ' + $state.reason)
    Write-Host ('Next: ' + $state.nextAction)
    Write-Host 'No downloads, native inference or personal data access occurred.'
    return
}
Write-Host 'DOU READER NEURAL: LOCAL CANDIDATE FILES DETECTED' -ForegroundColor Green
Write-Host 'Rights, network isolation, neural voice quality and institutional deployment are NOT verified.'
if (-not $Play) {
    Write-Host 'Only a read-only file check was performed. Nothing was played.'
    return
}
if (-not (Test-Path -LiteralPath $BundlePath -PathType Container)) {
    throw 'The reviewed local directory became unavailable.'
}
$model = @(Get-ChildItem -LiteralPath $BundlePath -File | Where-Object {
    $_.Name -match '^tr_TR-[a-zA-Z0-9_-]+\.onnx$'
})
if ($model.Count -ne 1) { throw 'Exactly one local Turkish ONNX model required.' }
$exe = Join-Path $BundlePath 'piper.exe'
$cfg = Join-Path $BundlePath ($model[0].Name+'.json')
$card = Join-Path $BundlePath 'MODEL_CARD'
foreach ($file in @($exe,$model[0].FullName,$cfg,$card)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Local bundle changed. Stop.' }
}
Write-Host 'Research-only fixed generic prompt; do not run on personal/student/exam content.'
& $lab -Executable $exe -Model $model[0].FullName -Config $cfg -ModelCard $card -PromptId $PromptId -Play -RightsReviewed
if (-not $?) { throw 'Research listening lab failed.' }
