@echo off
title Hyperion - Interactive Browser Profile & Port Selector (CDP)
cd /d "%~dp0"

node "%~dp0scripts\launch_interactive_profile.js"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [Hyperion] Error al ejecutar el supervisor.
)

echo.
echo ===================================================================
echo   [Hyperion] Sesion finalizada.
echo ===================================================================
pause
