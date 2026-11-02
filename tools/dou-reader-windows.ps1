# DOU Reader v2.44: explicit, on-demand Windows UI Automation + local SAPI pilot.
# Requires Windows PowerShell 5.1, desktop session and .NET Framework UIAutomation.
# No browser extension, HTTP calls, downloads, mic, recording, or content logs.
[CmdletBinding()]
param(
    [string[]]$AllowedProcesses = @('msedge', 'chrome', 'firefox', 'notepad'),
    [switch]$Check,
    [switch]$OwnVoice,
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
if ($Help) {
    Write-Host 'DOU Reader: powershell.exe -NoProfile -STA -File .\tools\dou-reader-windows.ps1 [-Check] [-OwnVoice] [-AllowedProcesses chrome,msedge,notepad]'
    Write-Host 'Ctrl+Alt+R: odaklanan ogeyi oku | Ctrl+Alt+Down/Up: siradaki/onceki | Ctrl+Alt+L/B: baglanti/dugme | Ctrl+Alt+H: baslik | Ctrl+Alt+Shift+H: onceki baslik | Ctrl+Alt+D: belge metni | Ctrl+Alt+X: durdur.'
    return
}
if ($env:OS -eq 'Linux' -or [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'DOU Reader Windows masaustu gerektirir. Linux/macOS desteklenmiyor.'
}
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 (.NET Framework) gereklidir. PowerShell 7 degil, powershell.exe kullanin.'
}
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'STA gerekli: powershell.exe -NoProfile -STA -File .\tools\dou-reader-windows.ps1'
}
# powershell.exe -File may pass a comma-separated value as one string; normalize it.
$AllowedProcesses = @($AllowedProcesses | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() })
if ($AllowedProcesses.Count -lt 1 -or $AllowedProcesses.Count -gt 12) {
    throw 'En az bir, en cok 12 izinli uygulama belirtin.'
}
foreach ($name in $AllowedProcesses) {
    if ($name -notmatch '^[a-zA-Z][a-zA-Z0-9_-]{0,49}$') {
        throw 'Izinli uygulama adlari yalnizca exe uzantisi olmadan basit surec adlari olabilir.'
    }
}
$source = Join-Path $PSScriptRoot 'dou-reader-windows-host.cs'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Okuyucu kaynak dosyasi bulunamadi.' }
# Add-Type -ReferencedAssemblies requires resolvable metadata paths on Windows PowerShell 5.1.
# Assembly names alone do not reliably resolve UIAutomationClient.dll across .NET installs.
$referenceNames = @('System.Windows.Forms','System.Drawing','UIAutomationClient','UIAutomationTypes','System.Speech','System.Core')
$refs = @()
try {
    Add-Type -AssemblyName 'System.Windows.Forms' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Drawing' -ErrorAction Stop
    Add-Type -AssemblyName 'UIAutomationClient' -ErrorAction Stop
    Add-Type -AssemblyName 'UIAutomationTypes' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Speech' -ErrorAction Stop
    foreach ($assemblyName in $referenceNames) {
        $assembly = [AppDomain]::CurrentDomain.GetAssemblies() |
            Where-Object { $_.GetName().Name -eq $assemblyName -and -not $_.IsDynamic } |
            Select-Object -First 1
        if ($null -eq $assembly -or [string]::IsNullOrWhiteSpace($assembly.Location) -or -not (Test-Path -LiteralPath $assembly.Location -PathType Leaf)) {
            throw ('Gerekli .NET derlemesi diskte bulunamadi: ' + $assemblyName)
        }
        $refs += $assembly.Location
    }
    Add-Type -TypeDefinition ([IO.File]::ReadAllText($source)) -ReferencedAssemblies $refs -ErrorAction Stop
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $localTr = @($speaker.GetInstalledVoices() | Where-Object {
            $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'tr-*'
        }).Count
    } finally { $speaker.Dispose() }
    if ($Check) {
        Write-Host ('DOU Reader teknik on denetim: UIA ve Windows Forms yuklendi; yerel Turkce SAPI sesi: ' + $localTr)
        if ($localTr -eq 0) { Write-Warning 'Yerel Turkce ses yok. Okuyucu otomatik uzaktaki sese gecmez.' }
        return
    }
    Write-Host 'DOU Reader v2.44: uygulama icinde metin tutulmaz ve hicbir sunucuya gonderilmez.'
    Write-Host ('Izin verilen uygulamalar: ' + ($AllowedProcesses -join ', '))
    $bridge = Join-Path $PSScriptRoot 'dou-speech-nvda-stdio.mjs'
    if ($OwnVoice) {
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'DOU yerel ses icin Node.js gereklidir.' }
        if (-not (Test-Path -LiteralPath $bridge -PathType Leaf)) { throw 'DOU yerel ses koprusu bulunamadi.' }
        Write-Host 'Ses: DOU yerel Turkce motor (deneysel); SAPI fallback kapali.'
    }
    [DouBepReader.Program]::Run([string[]]$AllowedProcesses,[bool]$OwnVoice,[string]$bridge)
} catch {
    throw ('DOU Reader baslatilamadi. Windows PowerShell 5.1, .NET Framework UIA ve yerel ses ayarlarini kontrol edin. ' + $_.Exception.Message)
}
