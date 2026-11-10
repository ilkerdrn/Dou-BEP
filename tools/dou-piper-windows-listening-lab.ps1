# DOU Speech V6: Windows-only manual Piper research playback.
# Requires local vetted Piper executable, Turkish ONNX, config and model card.
# No automatic downloads, no arbitrary text, no real exam/PII, no SAPI.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [Parameter(Mandatory=$true)][string]$Model,
    [Parameter(Mandatory=$true)][string]$Config,
    [Parameter(Mandatory=$true)][string]$ModelCard,
    [ValidateSet('TR001','TR004','TR005','TR007','TR009','TR010','TR013','TR014','TR017','TR018','TR021','TR023')]
    [string]$PromptId = 'TR001',
    [switch]$Play,
    [switch]$RightsReviewed
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) { throw 'Windows PowerShell 5.1 required.' }
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'Run with powershell.exe -STA.'
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $node) { throw 'Node.exe not installed.' }
$preflight = Join-Path $PSScriptRoot 'dou-piper-local-preflight.mjs'
$cli = Join-Path $PSScriptRoot 'dou-piper-fixed-prompt-lab.mjs'
if (-not (Test-Path -LiteralPath $preflight -PathType Leaf) -or
    -not (Test-Path -LiteralPath $cli -PathType Leaf)) { throw 'Research scripts not found.' }

$common = @('--exe',$Executable,'--model',$Model,'--config',$Config,'--card',$ModelCard)
$raw = & $node.Source $preflight @common
if ($LASTEXITCODE -ne 0) { throw 'Local model preflight command failed.' }
$inspection = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
if ($inspection.available -ne $true) {
    Write-Host ('Piper offline lab NOT READY: local artifacts unavailable (' + $inspection.reason + ').') -ForegroundColor Yellow
    return
}
if (-not $Play) {
    Write-Host 'Piper local artifacts detected. Inference NOT RUN. Model quality and rights NOT VERIFIED.'
    return
}
if (-not $RightsReviewed) {
    throw 'Explicit independent model rights review required before running native inference.'
}
Write-Host 'Running one fixed generic research prompt only. Do not use student/exam text.'
$encoded = & $node.Source $cli @common '--prompt' $PromptId '--research-only' '--rights-reviewed'
if ($LASTEXITCODE -ne 0) { throw 'Piper research inference failed.' }
if ($encoded -is [array] -or -not ($encoded -is [string]) -or
    $encoded.Length -lt 64 -or $encoded.Length -gt 2800000 -or
    $encoded -cnotmatch '^[A-Za-z0-9+/]+={0,2}$') {
    throw 'Unexpected PCM WAV base64 payload.'
}
$wav = [Convert]::FromBase64String($encoded)
if ($wav.Length -lt 46 -or $wav.Length -gt 2097152 -or
    [Text.Encoding]::ASCII.GetString($wav,0,4) -cne 'RIFF') {
    throw 'Invalid bounded WAV payload.'
}
Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
$memory = [System.IO.MemoryStream]::new([byte[]]$wav)
$player = [System.Media.SoundPlayer]::new($memory)
$form = $null
try {
    $player.Load()
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'DOU Piper - Local Research Only'
    $form.Width = 520
    $form.Height = 205
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $info = New-Object System.Windows.Forms.Label
    $info.SetBounds(20,16,475,65)
    $info.Text = 'Experimental external voice comparator. Prompt ID: ' + $PromptId + '. No production approval.'
    $play = New-Object System.Windows.Forms.Button
    $play.SetBounds(20,97,205,39)
    $play.Text = 'Play fixed sample'
    $play.Add_Click({ $player.Stop(); $memory.Position = 0; $player.Play() })
    $stop = New-Object System.Windows.Forms.Button
    $stop.SetBounds(250,97,205,39)
    $stop.Text = 'Stop'
    $stop.Add_Click({ $player.Stop() })
    $form.Controls.AddRange(@($info,$play,$stop))
    [void]$form.ShowDialog()
} finally {
    $player.Stop()
    $player.Dispose()
    $memory.Dispose()
    if ($null -ne $form) { $form.Dispose() }
}
