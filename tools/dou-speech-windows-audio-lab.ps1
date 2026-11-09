# DOU Speech offline Windows speaker laboratory (fixed synthetic cues only).
# No UIA content, arbitrary text, cloud, recording, persistence or SAPI.
[CmdletBinding()]
param(
    [ValidateSet('ready', 'stopped', 'help')]
    [string]$Cue = 'ready',
    [ValidateSet('baseline', 'candidate')]
    [string]$Arm = 'baseline',
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 required.'
}
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'Start with powershell.exe -STA.'
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $node) { throw 'Node.exe not found.' }
$cli = Join-Path $PSScriptRoot 'dou-speech-reader-cue.mjs'
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) {
    throw 'DOU Speech fixed cue bridge missing.'
}

# This command accepts only a fixed cue ID and returns a base64 WAV to memory.
# Stderr is never redirected into the audio output.
if ($Arm -eq 'candidate') {
    $comparison = Join-Path $PSScriptRoot 'dou-speech-compare-cue.mjs'
    if (-not (Test-Path -LiteralPath $comparison -PathType Leaf)) { throw 'Comparison bridge missing.' }
    $encoded = & $node.Source $comparison --cue $Cue --arm candidate
} else {
    $encoded = & $node.Source $cli --cue $Cue
}
if ($LASTEXITCODE -ne 0) { throw 'Synthetic cue generation failed.' }
if ($encoded -is [array]) { throw 'Unexpected multi-line audio payload.' }
if (-not ($encoded -is [string]) -or $encoded.Length -lt 60 -or
    $encoded.Length -gt 1400000 -or $encoded -cnotmatch '^[A-Za-z0-9+/]+={0,2}$') {
    throw 'Invalid synthetic audio payload.'
}
[byte[]]$wav = [Convert]::FromBase64String($encoded)
if ($wav.Length -lt 46 -or $wav.Length -gt 1048576) {
    throw 'WAV size outside bounded range.'
}
$ascii = [Text.Encoding]::ASCII
if ($ascii.GetString($wav,0,4) -cne 'RIFF' -or
    $ascii.GetString($wav,8,4) -cne 'WAVE' -or
    $ascii.GetString($wav,12,4) -cne 'fmt ' -or
    $ascii.GetString($wav,36,4) -cne 'data' -or
    [BitConverter]::ToUInt32($wav,4) -ne ($wav.Length - 8) -or
    [BitConverter]::ToUInt32($wav,16) -ne 16 -or
    [BitConverter]::ToUInt16($wav,20) -ne 1 -or
    [BitConverter]::ToUInt16($wav,22) -ne 1 -or
    [BitConverter]::ToUInt32($wav,24) -ne 22050 -or
    [BitConverter]::ToUInt16($wav,32) -ne 2 -or
    [BitConverter]::ToUInt16($wav,34) -ne 16 -or
    [BitConverter]::ToUInt32($wav,40) -ne ($wav.Length - 44)) {
    throw 'WAV header or format invalid.'
}
if ($Check) {
    Write-Host ('DOU Speech offline cue WAV PASS: ' + $Cue + ' [' + $Arm + '] (' + $wav.Length + ' bytes). Playback NOT TESTED.')
    return
}

Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
Add-Type -AssemblyName System.Drawing -ErrorAction Stop
$script:memory = [System.IO.MemoryStream]::new($wav)
$script:player = [System.Media.SoundPlayer]::new($script:memory)
try {
    $script:player.Load()
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'DOU Speech - Offline Audio Laboratory'
    $form.Width = 510
    $form.Height = 235
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $status = New-Object System.Windows.Forms.Label
    $status.Left = 20
    $status.Top = 18
    $status.Width = 455
    $status.Height = 58
    $status.Text = 'Experimental robotic sound only. No exam text or SAPI. Cue: ' + $Cue + ' / ' + $Arm
    $status.AccessibleName = 'Offline audio laboratory status'

    $play = New-Object System.Windows.Forms.Button
    $play.Text = 'Play synthetic cue'
    $play.AccessibleName = 'Play fixed synthetic sound'
    $play.Left = 20
    $play.Top = 100
    $play.Width = 205
    $play.Height = 42
    $play.Add_Click({
        $script:player.Stop()
        $script:memory.Position = 0
        $script:player.Play()
    })

    $stop = New-Object System.Windows.Forms.Button
    $stop.Text = 'Stop sound'
    $stop.AccessibleName = 'Stop fixed synthetic sound'
    $stop.Left = 250
    $stop.Top = 100
    $stop.Width = 205
    $stop.Height = 42
    $stop.Add_Click({ $script:player.Stop() })

    $form.Controls.AddRange(@($status, $play, $stop))
    [void]$form.ShowDialog()
} finally {
    if ($null -ne $script:player) { $script:player.Stop(); $script:player.Dispose() }
    if ($null -ne $script:memory) { $script:memory.Dispose() }
    if ($null -ne $form) { $form.Dispose() }
}
