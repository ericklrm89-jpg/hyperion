@echo off
title Hyperion Chrome Debug Launcher (Port 9222)
echo ==========================================================
echo   Abriendo Google Chrome en Modo Depuracion Remota para Hyperion
echo   Perfil: C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile
echo   Puerto: 9222
echo ==========================================================
taskkill /f /im chrome.exe >nul 2>&1
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile" --no-first-run "https://www.google.com"
echo.
echo Listo! Chrome iniciado con tus sesiones de Instagram, Facebook, TikTok, WhatsApp y Gemini.
