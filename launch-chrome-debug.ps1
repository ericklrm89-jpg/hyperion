# Hyperion - Interactive Browser Profile Selector & CDP Launcher (Admin Required)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "===================================================================" -ForegroundColor Yellow
    Write-Host "  [Hyperion] Solicitando permisos de Administrador (UAC)..." -ForegroundColor Yellow
    Write-Host "===================================================================" -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Set-Location $PSScriptRoot
$ScriptPath = Join-Path $PSScriptRoot "scripts\launch_interactive_profile.js"
node $ScriptPath
