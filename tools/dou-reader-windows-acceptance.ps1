# DOU Reader local acceptance gate. Read-only checks; no app/DB state changes.
# Requires Windows PowerShell 5.1, Node >=22.13 and a desktop session.
# This gate does not prove intelligible audio or full assistive-technology acceptance.
[CmdletBinding()]
param(
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
if ($Help) {
    Write-Host 'powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows-acceptance.ps1'
    Write-Host 'Checks: Node source regressions, synthetic math pronunciation C# behavior, Windows UIA C# compilation, local Turkish SAPI inventory.'
    return
}
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Bu denetim Windows PowerShell 5.1 gerektirir.'
}
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'STA gerekli: powershell.exe -NoProfile -STA -File .\tools\dou-reader-windows-acceptance.ps1'
}
$root = Split-Path -Parent $PSScriptRoot
$paths = @(
    (Join-Path $root 'dou-reader-windows.test.mjs'),
    (Join-Path $root 'dou-speech-phoneme-ui-race.test.mjs'),
    (Join-Path $root 'reader-speech-research/reader-speech-policy.test.mjs'),
    (Join-Path $root 'reader-speech-research/windows-sensitive-name-source.test.mjs'),
    (Join-Path $PSScriptRoot 'dou-reader-windows.ps1'),
    (Join-Path $PSScriptRoot 'dou-reader-windows-host.cs'),
    (Join-Path $PSScriptRoot 'dou-reader-pronunciation-check.ps1'),
    (Join-Path $PSScriptRoot 'dou-reader-privacy-check.ps1')
)
foreach ($path in $paths) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw ('Gerekli kaynak dosyası bulunamadı: ' + $path)
    }
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $node) { throw 'Node.js bulunamadı. Node 22.13 veya üzeri gerekli.' }
$versionRaw = (& $node.Source --version)
if ($LASTEXITCODE -ne 0 -or $versionRaw -notmatch '^v(\d+)\.(\d+)\.(\d+)') {
    throw 'Node sürümü okunamadı.'
}
$major = [int]$Matches[1]
$minor = [int]$Matches[2]
if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 13)) {
    throw ('Desteklenmeyen Node sürümü: ' + $versionRaw)
}
Push-Location $root
try {
    Write-Host '[1/4] DOU Reader Node regresyonları'
    & $node.Source '--test' 'dou-reader-windows.test.mjs' 'dou-speech-phoneme-ui-race.test.mjs' 'reader-speech-research/reader-speech-policy.test.mjs' 'reader-speech-research/windows-sensitive-name-source.test.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Reader Node regresyonları başarısız.' }

    Write-Host '[2/4] Üretim C# telaffuz sınıfı ve sentetik örnekler'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'dou-reader-pronunciation-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Türkçe telaffuz C# testi başarısız.' }

    Write-Host '[3/4] Windows UIA / Forms / SAPI C# derleme kontrolü'
    & powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'dou-reader-windows.ps1') -Check
    if ($LASTEXITCODE -ne 0) { throw 'Windows Reader C# derleme kontrolü başarısız.' }

    Write-Host '[4/4] Windows C# production sensitive-label behavior'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'dou-reader-privacy-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Reader privacy behavior FAIL.' }

    Write-Host 'DOU Reader teknik kabul kapısı PASS. Bu sonuç gerçek ses/erişilebilirlik kullanıcısı kabulü değildir.' -ForegroundColor Green
}
finally {
    Pop-Location
}
