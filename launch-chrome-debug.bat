@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)

:: ===================================================================
:: 1. VERIFICAR Y AUTO-ELEVAR A ADMINISTRADOR CON VENTANA PERSISTENTE
:: ===================================================================
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ===================================================================
    echo   [Hyperion] Solicitando permisos de Administrador (UAC)...
    echo ===================================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"\"%~f0\"\"\"' -Verb RunAs"
    exit /b
)

:: ===================================================================
:: 2. EJECUTAR SUPERVISOR DESDE EL DIRECTORIO DEL PROYECTO
:: ===================================================================
cd /d "%~dp0"

node "%~dp0scripts\launch_interactive_profile.js"

echo.
echo ===================================================================
echo   [Hyperion] Sesion finalizada o detenida por el usuario.
echo ===================================================================
pause
