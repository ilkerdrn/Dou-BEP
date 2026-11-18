@echo off
rem DOU BEP salon (LAN) modu. Bu bilgisayar SUNUCUDUR; ogrenci bilgisayarlari yalnizca tarayici kullanir.
rem Yonetim sayfalari yalnizca bu bilgisayardan (http://localhost:4173) acilir. Trafik sifresizdir (HTTP): izole salon agi kullanin.
setlocal
cd /d "%~dp0"
set BEP_LAN_MODE=1
set BEP_PILOT_REDEEM_GLOBAL_LIMIT=200
set BEP_PILOT_MAX_OPEN_SESSIONS=100
set BEP_PILOT_CODE_VALID_MINUTES=120
if not defined BEP_TERMINOLOGY set BEP_TERMINOLOGY=university
echo.
echo Gerekirse (yonetici PowerShell, bir kez) Windows guvenlik duvari kurali:
echo   netsh advfirewall firewall add rule name="DOU BEP Salon" dir=in action=allow protocol=TCP localport=4173 profile=private
echo.
call BASLAT.bat
