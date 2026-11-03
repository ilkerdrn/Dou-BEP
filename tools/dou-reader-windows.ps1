# DOU Reader v2.44: explicit, on-demand Windows UI Automation + local SAPI pilot.
# Requires Windows PowerShell 5.1, desktop session and .NET Framework UIAutomation.
# No browser extension, HTTP calls, downloads, mic, recording, or content logs.
[CmdletBinding()]
param(
    [string[]]$AllowedProcesses = @('msedge', 'chrome', 'firefox', 'notepad'),
    [switch]$Check,
    [switch]$OwnVoice,
    [string]$PdfTextExecutable = '',
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
if ($Help) {
    Write-Host 'DOU Reader: powershell.exe -NoProfile -STA -File .\tools\dou-reader-windows.ps1 [-Check] [-OwnVoice] [-PdfTextExecutable C:\\Poppler\\pdftotext.exe] [-AllowedProcesses chrome,msedge,notepad]'
    Write-Host 'Ctrl+Alt+R: odaklanan ogeyi oku | Ctrl+Alt+Down/Up: siradaki/onceki | Ctrl+Alt+L/B: baglanti/dugme | Ctrl+Alt+H: baslik | Ctrl+Alt+Shift+H: onceki baslik | Ctrl+Alt+D: sonraki metin | Ctrl+Alt+Shift+D: bolum | Ctrl+Alt+Shift+L/T/C: liste/tablo/hucre | Ctrl+Alt+Shift+P: paragraf | Ctrl+Alt+Shift+Sol/Sag: cumle | Ctrl+Alt+P: duraklat/devam | Ctrl+Alt+X: durdur.'
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
$contract = Join-Path $PSScriptRoot 'dou-reader-speech-contract.cs'
$documentContract = Join-Path $PSScriptRoot 'dou-reader-document-contract.cs'
$structureContract = Join-Path $PSScriptRoot 'dou-reader-structure-contract.cs'
$tableContextContract = Join-Path $PSScriptRoot 'dou-reader-table-context-contract.cs'
$tableHeaderContract = Join-Path $PSScriptRoot 'dou-reader-table-header-contract.cs'
$sentenceContract = Join-Path $PSScriptRoot 'dou-reader-sentence-contract.cs'
$offlineDocument = Join-Path $PSScriptRoot 'dou-reader-offline-document.cs'
$offlinePdf = Join-Path $PSScriptRoot 'dou-reader-offline-pdf.cs'
if (-not (Test-Path -LiteralPath $contract -PathType Leaf)) { throw 'Okuyucu ses sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $documentContract -PathType Leaf)) { throw 'Okuyucu belge sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $structureContract -PathType Leaf)) { throw 'Okuyucu yapi sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $tableContextContract -PathType Leaf)) { throw 'Okuyucu tablo baglami sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $tableHeaderContract -PathType Leaf)) { throw 'Okuyucu tablo baslik sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $sentenceContract -PathType Leaf)) { throw 'Okuyucu cumle sozlesmesi bulunamadi.' }
if (-not (Test-Path -LiteralPath $offlineDocument -PathType Leaf)) { throw 'Okuyucu cevrimdisi belge modulu bulunamadi.' }
if (-not (Test-Path -LiteralPath $offlinePdf -PathType Leaf)) { throw 'Okuyucu cevrimdisi PDF modulu bulunamadi.' }
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Okuyucu kaynak dosyasi bulunamadi.' }
# Add-Type -ReferencedAssemblies requires resolvable metadata paths on Windows PowerShell 5.1.
# Assembly names alone do not reliably resolve UIAutomationClient.dll across .NET installs.
$referenceNames = @('System','System.Core','System.Windows.Forms','System.Drawing','UIAutomationClient','UIAutomationTypes','System.Speech','System.IO.Compression','System.Xml')
$refs = @()
try {
    Add-Type -AssemblyName 'System' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Windows.Forms' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Drawing' -ErrorAction Stop
    Add-Type -AssemblyName 'UIAutomationClient' -ErrorAction Stop
    Add-Type -AssemblyName 'UIAutomationTypes' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Speech' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Core' -ErrorAction Stop
    Add-Type -AssemblyName 'System.IO.Compression' -ErrorAction Stop
    Add-Type -AssemblyName 'System.Xml' -ErrorAction Stop
    foreach ($assemblyName in $referenceNames) {
        $assembly = [AppDomain]::CurrentDomain.GetAssemblies() |
            Where-Object { $_.GetName().Name -eq $assemblyName -and -not $_.IsDynamic } |
            Select-Object -First 1
        if ($null -eq $assembly -or [string]::IsNullOrWhiteSpace($assembly.Location) -or -not (Test-Path -LiteralPath $assembly.Location -PathType Leaf)) {
            throw ('Gerekli .NET derlemesi diskte bulunamadi: ' + $assemblyName)
        }
        $refs += $assembly.Location
    }
    Add-Type -TypeDefinition (([IO.File]::ReadAllText($source)) + [Environment]::NewLine + ([IO.File]::ReadAllText($contract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($documentContract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($structureContract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($tableContextContract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($tableHeaderContract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($sentenceContract)) + [Environment]::NewLine + ([IO.File]::ReadAllText($offlineDocument)) + [Environment]::NewLine + ([IO.File]::ReadAllText($offlinePdf))) -ReferencedAssemblies $refs -ErrorAction Stop
    [DouBepReader.ReaderSpeechContract]::SelfTest()
    [DouBepReader.ReaderDocumentContract]::SelfTest()
    [DouBepReader.ReaderStructureContract]::SelfTest()
    [DouBepReader.ReaderTableContextContract]::SelfTest()
    [DouBepReader.ReaderTableHeaderContract]::SelfTest()
    [DouBepReader.ReaderSentenceContract]::SelfTest()
    [DouBepReader.ReaderOfflineDocument]::SelfTest()
    [DouBepReader.ReaderOfflinePdf]::SelfTest()
    $pdfExe = [DouBepReader.ReaderOfflinePdf]::ValidateExecutable($PdfTextExecutable)
    $nodeExe = ''
    if ($OwnVoice) {
        # Resolve the executable once. Subsequent utterances must never repeat
        # a potentially different PATH search for "node".
        $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($null -eq $nodeCommand) { throw 'OwnVoice: Node.js calistirilabilir dosyasi bulunamadi.' }
        $nodeExe = [IO.Path]::GetFullPath([string]$nodeCommand.Source)
        if ([IO.Path]::GetFileName($nodeExe) -ine 'node.exe' -or
            -not (Test-Path -LiteralPath $nodeExe -PathType Leaf) -or
            $nodeExe.StartsWith('\\')) {
            throw 'OwnVoice: guvenilir yerel Node.js calistirilabilir dosyasi gerekli.'
        }
        $nodeRoot = [IO.Path]::GetPathRoot($nodeExe)
        if ([IO.DriveInfo]::new($nodeRoot).DriveType -notin @([IO.DriveType]::Fixed, [IO.DriveType]::Removable)) {
            throw 'OwnVoice: ag surucusundeki Node.js desteklenmez.'
        }
        $bridge = Join-Path $PSScriptRoot 'dou-speech-nvda-stdio.mjs'
        if (-not (Test-Path -LiteralPath $bridge -PathType Leaf)) {
            throw 'OwnVoice: yerel ses koprusu bulunamadi.'
        }
    }
    $localTr = 0
    if (-not $OwnVoice) {
        # OwnVoice mode and its -Check must not instantiate Windows SAPI.
        # Diagnostics only enumerate SAPI when the user selected SAPI mode.
        $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
        try {
            $localTr = @($speaker.GetInstalledVoices() | Where-Object {
                $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'tr-*'
            }).Count
        } finally { $speaker.Dispose() }
    }
    if ($Check) {
        if ($OwnVoice) {
            Write-Host 'DOU Reader teknik on denetim: C# UIA/WinForms, sabit Node.js yolu ve yerel ses koprusu mevcut (SAPI kurulumu gerekmiyor).'
        }
        else {
            Write-Host ('DOU Reader teknik on denetim: C# UIA/WinForms ve yerel SAPI sesi: ' + $localTr)
            if ($localTr -eq 0) { Write-Warning 'Yerel Turkce SAPI sesi yok. Otomatik uzaktaki sese gecilmez.' }
        }
        return
    }
    Write-Host 'DOU Reader OS pilot: metin ag servisine gonderilmez; WAV RAM icinde tutulur.'
    Write-Host ('Izin verilen uygulamalar: ' + ($AllowedProcesses -join ', '))
    if ($OwnVoice) {
        Write-Host 'Ses: DOU yerel Turkce motor (deneysel); Node yolu baslangicta sabitlendi, SAPI fallback kapali.'
    }
    [DouBepReader.Program]::Run([string[]]$AllowedProcesses,[bool]$OwnVoice,[string]$bridge,[string]$pdfExe,[string]$nodeExe)
} catch {
    throw ('DOU Reader baslatilamadi. Windows PowerShell 5.1, .NET Framework UIA ve yerel ses ayarlarini kontrol edin. ' + $_.Exception.Message)
}
