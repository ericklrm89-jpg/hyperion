@echo off
title Hyperion - Chrome Remote Debug Launcher (Port 9222)
echo ===================================================================
echo   HYPERION BROWSER - CHROME REMOTE DEBUG LAUNCHER (CDP 9222)
echo ===================================================================

set PROFILE_DIR=%USERPROFILE%\.hyperion\chrome_profile
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

echo [1/3] Cerrando procesos anteriores de Chrome...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Limpiando bloqueos residuales de perfil...
del /f /q "%PROFILE_DIR%\SingletonLock" >nul 2>&1
del /f /q "%PROFILE_DIR%\SingletonCookie" >nul 2>&1
del /f /q "%PROFILE_DIR%\SingletonSocket" >nul 2>&1
del /f /q "%PROFILE_DIR%\lockfile" >nul 2>&1

echo [3/3] Iniciando Google Chrome en puerto 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%PROFILE_DIR%" --no-first-run --restore-last-session "https://www.google.com"

echo.
echo ===================================================================
echo   LISTO! Chrome iniciado en http://127.0.0.1:9222
echo   Perfil: %PROFILE_DIR%
echo ===================================================================
timeout /t 3
