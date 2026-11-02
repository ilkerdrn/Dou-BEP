# DOU BEP 2.66 - Kurumsal sinav editoru bos ekran duzeltmesi.
# Yalnizca server.mjs icindeki uc statik JS izin satirini ekler.
# data/, SQLite, oturumlar ve kimlik bilgilerini degistirmez.
$ErrorActionPreference = 'Stop'
$project = Join-Path $env:USERPROFILE 'Desktop\New folder (7)'
$path = Join-Path $project 'server.mjs'
if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "server.mjs bulunamadi: $path. Proje klasorunu kontrol edin."
}
Set-Location -LiteralPath $project
$encoding = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$marker = " '/institutional-exams.mjs':['institutional-exams.mjs','text/javascript; charset=utf-8'],"
if (-not $text.Contains($marker)) {
    throw 'Beklenen editor route satiri bulunamadi. Dosya degistirilmedi.'
}
$required = @(
    " '/question-access.mjs':['question-access.mjs','text/javascript; charset=utf-8'],",
    " '/presentation-variants.mjs':['presentation-variants.mjs','text/javascript; charset=utf-8'],",
    " '/objective-observations.mjs':['objective-observations.mjs','text/javascript; charset=utf-8'],"
)
foreach ($file in @('question-access.mjs','presentation-variants.mjs','objective-observations.mjs')) {
    if (-not (Test-Path -LiteralPath (Join-Path $project $file) -PathType Leaf)) {
        throw "Gerekli dosya bulunamadi: $file. Proje degistirilmedi."
    }
}
$missing = @($required | Where-Object { -not $text.Contains($_) })
if ($missing.Count -eq 0) {
    Write-Host 'Duzeltme zaten mevcut. Ek degisiklik yapilmadi.' -ForegroundColor Green
} else {
    $backup = "$path.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $path -Destination $backup -ErrorAction Stop
    $newline = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $patched = $text.Replace($marker, (($missing -join $newline) + $newline + $marker))
    try {
        [System.IO.File]::WriteAllText($path, $patched, $encoding)
        & node --check $path
        if ($LASTEXITCODE -ne 0) { throw 'Node.js syntax kontrolu basarisiz.' }
    } catch {
        Copy-Item -LiteralPath $backup -Destination $path -Force
        throw "Duzeltme geri alindi: $_"
    }
    Write-Host "Duzeltme uygulandi ($($missing.Count) JS modul izni)." -ForegroundColor Green
    Write-Host "Yedek: $backup"
}
Write-Host 'ACIK BEP SUNUCU PENCERESINDE CTRL+C ile durdurun; sonra BASLAT.bat ile yeniden acin.' -ForegroundColor Yellow
Write-Host 'Ardindan Ctrl+F5 ve http://127.0.0.1:4173/kurumsal-sinav' -ForegroundColor Cyan
