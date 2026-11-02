@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title DOU BEP Sinav Atolyesi - v2.81

rem Find Node.js in PATH or standard Windows install locations.
set "NODE_EXE="
where node.exe >nul 2>&1
if not errorlevel 1 set "NODE_EXE=node.exe"
if defined NODE_EXE goto check_version

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if defined NODE_EXE goto check_version
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if defined NODE_EXE goto check_version
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined NODE_EXE goto check_version

echo.
echo [HATA] Node.js bulunamadi.
echo Node.js 22.13 veya daha yeni bir surum gereklidir.
echo Resmi indirme: https://nodejs.org/
echo Kurulumdan sonra bu pencereyi kapatip BASLAT.bat dosyasini yeniden acin.
echo.
pause
exit /b 1

:check_version
"%NODE_EXE%" -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=13)?0:1)"
if not errorlevel 1 goto launch

echo.
echo [HATA] Node.js bulundu ama surumu eski. Node.js 22.13+ gereklidir.
"%NODE_EXE%" --version
echo Resmi indirme: https://nodejs.org/
echo.
pause
exit /b 1

:launch
if exist "server.mjs" goto start_server
echo.
echo [HATA] server.mjs bulunamadi.
echo ZIP arsivinin TAMAMINI tek bir klasore cikartin.
echo BASLAT.bat dosyasini proje klasorunden calistirin.
echo.
pause
exit /b 1

:start_server
"%NODE_EXE%" "%~dp0launcher-check.mjs"
if errorlevel 12 goto older_bep
if errorlevel 11 goto port_other
if errorlevel 10 goto already_running
if errorlevel 1 goto launch_failed
goto launch_main

:already_running
start "" "http://127.0.0.1:4173/kurum"
echo [BILGI] Zaten acik olan DOU BEP sekmesi kullanilacak.
exit /b 0

:older_bep
echo [UYARI] Onceki DOU BEP surumu acik. Eski BASLAT penceresini Ctrl+C ile kapatin.
echo [BILGI] Mevcut veri tabani ve hesabiniza dokunulmadi.
pause
exit /b 12

:port_other
echo [HATA] 4173 portu baska bir uygulamada. PID kontrolu icin PowerShell kullanin.
pause
exit /b 11

:launch_failed
echo [HATA] Port kontrolu yapilamadi.
pause
exit /b 1

:launch_main
echo.
echo [OK] Node.js kullanima hazir.
"%NODE_EXE%" --version
echo [BILGI] DOU BEP Sinav Atolyesi baslatiliyor.
echo [ADRES] http://127.0.0.1:4173/kurum
echo [BILGI] Uygulamayi kapatmak icin Ctrl+C kullanin.
echo.
start "" "http://127.0.0.1:4173/kurum"
"%NODE_EXE%" "%~dp0server.mjs"
set "BEP_EXIT_CODE=%ERRORLEVEL%"
echo.
echo [BILGI] Sunucu kapandi. Cikis kodu: %BEP_EXIT_CODE%
pause
exit /b %BEP_EXIT_CODE%
