# Hyperion Chrome Debug Launcher (PowerShell)
# Ports: 9222 (IPv4 127.0.0.1)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  HYPERION — Iniciando Chrome en Modo Depuracion CDP (9222)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Clean up lingering Node.js and Chrome processes
Write-Host "Limpiando instancias previas..." -ForegroundColor Yellow
Get-Process chrome, node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# 2. Chrome executable path resolution
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chromeExe) {
    Write-Error "No se encontro Google Chrome en las rutas estandar de Windows."
    exit 1
}

# 3. Profile directory
$profileDir = "C:\FairDraw\moneyprinter\Backend\obscura_profiles\default_profile"
if (-not (Test-Path $profileDir)) {
    $profileDir = "$PSScriptRoot\chrome_debug_profile"
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

Write-Host "Ejecutable: $chromeExe" -ForegroundColor Green
Write-Host "Perfil:     $profileDir" -ForegroundColor Green
Write-Host "Puerto CDP: 9222" -ForegroundColor Green

# 4. Start Chrome
Start-Process -FilePath $chromeExe -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.google.com"
)

Start-Sleep -Seconds 2
Write-Host "Chrome iniciado correctamente en puerto 9222." -ForegroundColor Green
