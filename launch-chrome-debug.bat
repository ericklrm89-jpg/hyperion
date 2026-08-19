@echo off
title Hyperion - Interactive Browser Profile Selector (CDP 9222)

:: ===================================================================
:: 1. VERIFICAR SI YA SE TIENEN PRIVILEGIOS DE ADMINISTRADOR
:: ===================================================================
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' EQU '0' (
    goto :RUN_SUPERVISOR
) else (
    goto :ELEVATE_UAC
)

:: ===================================================================
:: 2. SOLICITAR PERMISOS UAC MEDIANTE WINDOWS SHELL APPLICATION
:: ===================================================================
:ELEVATE_UAC
echo ===================================================================
echo   [Hyperion] Solicitando permisos de Administrador a Windows...
echo ===================================================================

echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\hyperion_uac.vbs"
echo UAC.ShellExecute "cmd.exe", "/k cd /d ""%~dp0"" && node scripts\launch_interactive_profile.js", "", "runas", 1 >> "%temp%\hyperion_uac.vbs"

"%temp%\hyperion_uac.vbs"
del "%temp%\hyperion_uac.vbs" >nul 2>&1
exit /b

:: ===================================================================
:: 3. EJECUCIÓN DEL SUPERVISOR EN MODO ADMINISTRADOR
:: ===================================================================
:RUN_SUPERVISOR
cd /d "%~dp0"

node scripts\launch_interactive_profile.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [Hyperion] Hubo un error al ejecutar el supervisor.
)

echo.
echo ===================================================================
echo   [Hyperion] Sesion finalizada.
echo ===================================================================
pause
