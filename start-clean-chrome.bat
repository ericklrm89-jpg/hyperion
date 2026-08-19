@echo off
title NanoAI / Hyperion - Chrome Debug Clean Launcher (Port 9222)
echo ===================================================================
echo   LIMPIANDO Y ARRANCANDO CHROME EN MODO DEPURACION REMOTA (CDP 9222)
echo ===================================================================

echo [1/3] Cerrando procesos anteriores de Chrome...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Eliminando bloqueos de perfil (SingletonLock)...
del /f /q "C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile\SingletonLock" >nul 2>&1
del /f /q "C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile\SingletonCookie" >nul 2>&1
del /f /q "C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile\SingletonSocket" >nul 2>&1
del /f /q "C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile\lockfile" >nul 2>&1

echo [3/3] Iniciando Chrome en puerto 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile" --no-first-run --restore-last-session "https://web.whatsapp.com" "https://mail.google.com"

echo.
echo ===================================================================
echo   LISTO! Chrome ha sido iniciado en el puerto 9222.
echo   WhatsApp Web y Gmail estan cargando.
echo ===================================================================
timeout /t 5
