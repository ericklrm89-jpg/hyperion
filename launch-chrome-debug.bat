@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)
node "%~dp0scripts\launch_interactive_profile.js"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Hyperion] Error al ejecutar el selector de perfiles.
    pause
)
