# DOU Speech v2.41 — WINDOWS-ONLY, READ-ONLY offline voice inventory.
# Does not use internet, download a voice pack, or record speech.
[CmdletBinding()]
param([switch]$Json)
$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName 'System.Speech'
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $voices = @($speaker.GetInstalledVoices() | ForEach-Object {
            $info = $_.VoiceInfo
            if ($_.Enabled -and $info.Culture.Name -like 'tr-*') {
                [PSCustomObject]@{ Name = $info.Name; Language = $info.Culture.Name; Platform = 'Windows System.Speech'; Installed = $true }
            }
        })
    } finally { $speaker.Dispose() }
    if ($Json) { $voices | ConvertTo-Json -Depth 3 }
    else {
        Write-Host 'DOU Speech — Windows üzerinde kurulu Türkçe SAPI sesleri (salt okunur)' -ForegroundColor Cyan
        if ($voices.Count -eq 0) { Write-Host 'Türkçe yerel ses bulunamadı. Ekran okuyucu yine kullanılabilir.' -ForegroundColor Yellow }
        else { $voices | Format-Table -AutoSize }
    }
} catch {
    Write-Error ('Yerel System.Speech denetimi çalıştırılamadı: ' + $_.Exception.Message)
    exit 1
}
