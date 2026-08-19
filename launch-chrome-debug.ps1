# Hyperion - Chrome Remote Debug Launcher (PowerShell)
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  HYPERION BROWSER - CHROME REMOTE DEBUG LAUNCHER (CDP 9222)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

$ProfileDir = "$env:USERPROFILE\.hyperion\chrome_profile"
if (-not (Test-Path $ProfileDir)) {
    New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null
}

Write-Host "[1/3] Cerrando procesos anteriores de Chrome..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "[2/3] Limpiando bloqueos residuales de perfil..." -ForegroundColor Yellow
Remove-Item "$ProfileDir\SingletonLock", "$ProfileDir\SingletonCookie", "$ProfileDir\SingletonSocket", "$ProfileDir\lockfile" -Force -ErrorAction SilentlyContinue

Write-Host "[3/3] Iniciando Google Chrome en puerto 9222..." -ForegroundColor Green
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

Start-Process -FilePath $ChromePath -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$ProfileDir",
    "--no-first-run",
    "--restore-last-session",
    "https://www.google.com"
)

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  LISTO! Chrome iniciado en http://127.0.0.1:9222" -ForegroundColor Green
Write-Host "  Perfil: $ProfileDir" -ForegroundColor White
Write-Host "===================================================================" -ForegroundColor Cyan
