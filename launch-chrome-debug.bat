@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)

:: ===================================================================
:: 1. VERIFICAR Y AUTO-ELEVAR A PERMISOS DE ADMINISTRADOR (UAC)
:: ===================================================================
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ===================================================================
    echo   [Hyperion] Solicitando permisos de Administrador (UAC)...
    echo ===================================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: ===================================================================
:: 2. EJECUCIÓN CON PRIVILEGIOS DE ADMINISTRADOR
:: ===================================================================
cd /d "%~dp0"

node "%~dp0scripts\launch_interactive_profile.js"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Hyperion] Error al ejecutar el selector de perfiles.
)

echo.
echo [Hyperion] Sesion finalizada.
pause
