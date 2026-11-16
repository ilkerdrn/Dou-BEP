# Offline voice readiness diagnostics for DOU Reader.
# No installation, registry modification, network requests, or exam content access.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop') {
    throw 'Windows PowerShell 5.1 (.NET Framework) gereklidir.'
}
try {
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $voices = @($speaker.GetInstalledVoices() | ForEach-Object {
            [PSCustomObject]@{
                Name = $_.VoiceInfo.Name
                Culture = $_.VoiceInfo.Culture.Name
                Gender = [string]$_.VoiceInfo.Gender
                Enabled = [bool]$_.Enabled
            }
        })
    } finally {
        $speaker.Dispose()
    }
} catch {
    throw ('Yerel Windows SAPI envanteri okunamadi: ' + $_.Exception.Message)
}
$turkish = @($voices | Where-Object { $_.Enabled -and $_.Culture -like 'tr-*' })
$turkishFemale = @($turkish | Where-Object { $_.Gender -eq 'Female' })
Write-Host '=== DOU READER - CEVRIMDISI SES DURUMU ===' -ForegroundColor Cyan
Write-Host ('SAPI ses sayisi: ' + $voices.Count)
Write-Host ('Kullanilabilir Turkce SAPI ses sayisi: ' + $turkish.Count)
Write-Host ('Kullanilabilir Turkce kadin SAPI ses sayisi: ' + $turkishFemale.Count)
if ($voices.Count -gt 0) {
    $voices | Sort-Object Culture,Name | Format-Table Name,Culture,Gender,Enabled -AutoSize
}
if ($turkish.Count -eq 0) {
    Write-Warning 'DOU Reader su anda gercek ekran metnini Turkce seslendiremez.'
    Write-Host 'Windows Ayarlari > Saat ve dil > Dil ve bolge altinda Turkce ses ozelliklerini kontrol edin.'
    Write-Host 'Windows tarafindan sunulan bir sesin varligi, System.Speech SAPI uyumlulugunu garanti etmez.'
    Write-Host 'Yerel ses kurulumu sonrasinda bu komutu yeniden calistirarak SAPI uygunlugunu dogrulayin.'
    Write-Host 'DOU Speech deneysel WAV demosu gercek sinav metni icin alternatif degildir.'
    Write-Host 'Durum: SES HAZIR DEGIL (teknik testler bundan bagimsiz PASS olabilir).' -ForegroundColor Yellow
} elseif ($turkishFemale.Count -eq 0) {
    Write-Warning 'Turkce SAPI sesi var ancak yerel Turkce kadin sesi bulunamadi. Kadin sesi secimi hazir degil.'
    Write-Host 'Sesin cinsiyeti, ses motorunun bildirdigi metadata ile belirlenir; isimden tahmin edilmez.'
    Write-Host 'Durum: TURKCE KADIN SESI HAZIR DEGIL.' -ForegroundColor Yellow
} else {
    Write-Host 'Yerel Turkce kadin SAPI sesi bulundu. Bu bulgu yalnizca teknik uygunluktur.' -ForegroundColor Green
    Write-Host 'Dogal ve anlasilir seslendirme icin insan dinleme kabulunden gecmesi gerekir.'
    Write-Host 'Durum: TURKCE KADIN SESI ADAYI MEVCUT (PRODUKSIYON ONAYI DEGIL).' -ForegroundColor Yellow
}
