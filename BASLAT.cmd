@echo off

setlocal enabledelayedexpansion

cd /d "%~dp0"

title PIXELA



set "NODE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE%" set "NODE=node"



if not exist "server.js" (

  echo HATA: server.js yok!

  pause

  exit /b 1

)



for %%P in (8080 8888 9000 7777) do (

  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

)



start "PIXELA Sunucu" /MIN "%NODE%" "%~dp0server.js"



set /a N=0

:BEKLE

set /a N+=1

if !N! GTR 30 goto HATA



for %%P in (8888 9000 7777 8080) do (

  powershell -NoProfile -Command "try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:%%P/ping' -UseBasicParsing -TimeoutSec 2;if($r.StatusCode -eq 200){exit 0}else{exit 1}}catch{exit 1}"

  if !errorlevel!==0 (
    echo.
    echo  PIXELA acildi: http://127.0.0.1:%%P/
    echo  Tarayicida Ctrl+Shift+R ile sert yenile!
    echo  Sunucu penceresini KAPATMA!
    echo.
    start "" "http://127.0.0.1:%%P/"
    exit /b 0
  )

)



timeout /t 1 /nobreak >nul

goto BEKLE



:HATA

echo Sunucu baslatilamadi! Node.js yuklu mu?

pause

exit /b 1
