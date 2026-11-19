@echo off
setlocal EnableExtensions
title DOU BEP - Demo indir ve baslat
rem Bu dosyayi bos bir klasore koyup cift tiklayin. Node.js 22.13+ gerekir.
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar deneyin.
  pause & exit /b 1
)
if not exist "Dou-BEP-demo\tools\start-demo-windows.ps1" (
  echo Proje indiriliyor...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest 'https://github.com/ilkerdrn/Dou-BEP/archive/refs/heads/claude/dou-bep-accessible-exam-0tpcuy.zip' -OutFile 'dou-bep.zip'; Expand-Archive 'dou-bep.zip' -DestinationPath 'tmp-extract' -Force; $d=(Get-ChildItem 'tmp-extract' -Directory | Select-Object -First 1).FullName; Move-Item $d 'Dou-BEP-demo'; Remove-Item 'tmp-extract' -Recurse -Force; Remove-Item 'dou-bep.zip'"
  if errorlevel 1 (
    echo [HATA] Indirme basarisiz. Depo ozel ise GitHub'dan ZIP'i elle indirip Dou-BEP-demo klasorune cikarin.
    pause & exit /b 1
  )
)
cd Dou-BEP-demo
powershell -NoProfile -ExecutionPolicy Bypass -File tools\start-demo-windows.ps1
pause
