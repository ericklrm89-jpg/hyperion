@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)

:: ===================================================================
:: 1. VERIFICAR PERMISOS DE ADMINISTRADOR
:: ===================================================================
net session >nul 2>&1
if %ERRORLEVEL% equ 0 goto :RUN_ADMIN

:: ===================================================================
:: 2. SOLICITAR ELEVACIÓN UAC (PROMPT DE WINDOWS)
:: ===================================================================
echo ===================================================================
echo   [Hyperion] Solicitando permisos de Administrador (UAC)...
echo ===================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k cd /d """%~dp0""" && node """%~dp0scripts\launch_interactive_profile.js"""" -Verb RunAs"
exit /b

:: ===================================================================
:: 3. EJECUCIÓN CON PRIVILEGIOS DE ADMINISTRADOR
:: ===================================================================
:RUN_ADMIN
cd /d "%~dp0"

node "%~dp0scripts\launch_interactive_profile.js"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [Hyperion] Hubo un error al ejecutar el supervisor.
)

echo.
echo ===================================================================
echo   [Hyperion] Sesion finalizada.
echo ===================================================================
pause
