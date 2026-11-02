# DOU Reader OS | isolated, non-destructive acceptance preflight.
# Windows PowerShell 5.1; no git actions, database access, app launch by default.
[CmdletBinding()]
param(
    [switch]$LaunchReader,
    [string[]]$AllowedProcesses = @('notepad')
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$js = Join-Path $root 'dou-reader-own-voice.test.mjs'
$reader = Join-Path $PSScriptRoot 'dou-reader-windows.ps1'

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'DOU Reader kabul testi Windows gerektirir.'
}
if (-not (Test-Path -LiteralPath $js -PathType Leaf) -or
    -not (Test-Path -LiteralPath $reader -PathType Leaf)) {
    throw 'Kabul testi kaynak dosyalari eksik.'
}
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
    throw 'Node.js bulunamadi. Yalniz yerel motor test edilebilir.'
}

Write-Host '[1/2] Yerel Turkce WAV / guvenlik / kaynak regresyon testleri' -ForegroundColor Cyan
& $node.Source --test $js
if ($LASTEXITCODE -ne 0) { throw 'DOU Reader Node testleri basarisiz.' }

Write-Host '[2/2] Windows UIA C# derleme ve ses sozlesmesi self-test' -ForegroundColor Cyan
& powershell.exe -NoProfile -STA -File $reader -Check
if ($LASTEXITCODE -ne 0) { throw 'DOU Reader Windows derleme veya self-test basarisiz.' }

Write-Host 'DOU Reader on-kabul basarili: Node + C# testleri gecti.' -ForegroundColor Green
Write-Warning 'Bu otomatik testler duyulur ses, gercek klavye erisilebilirligi veya UIA kabulunu kanitlamaz.'
if ($LaunchReader) {
    Write-Host 'Manuel ses kabul modu: uygulama yalniz izin verilen islemlere erisir.' -ForegroundColor Cyan
    & powershell.exe -NoProfile -STA -File $reader -OwnVoice -AllowedProcesses $AllowedProcesses
    if ($LASTEXITCODE -ne 0) { throw 'DOU Reader manuel ses test penceresi baslatilamadi.' }
}
