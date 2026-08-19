@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)
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
