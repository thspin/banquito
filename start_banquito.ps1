# ============================================
# Banquito - Start Script (background-safe)
# ============================================
# Uso directo:  .\start_banquito.ps1
# Uso silencioso: llamado por Banquito.vbs (sin ventana)
# ============================================

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $ROOT "backend"
$frontendDir = Join-Path $ROOT "frontend"
$venvPython  = Join-Path $backendDir "venv_313\Scripts\python.exe"

# Detectar si tenemos ventana visible para mostrar output
$hasWindow = $Host.Name -ne "Default Host"

function Log($msg, $color = "White") {
    if ($hasWindow) { Write-Host $msg -ForegroundColor $color }
}

# --- Verificar venv ---
if (-not (Test-Path $venvPython)) {
    if ($hasWindow) {
        Write-Host "[ERROR] No se encontro el venv en backend/venv_313" -ForegroundColor Red
        Write-Host "Crea el entorno con: cd backend && python -m venv venv_313 && venv_313\Scripts\pip install -r requirements.txt"
        Read-Host "Presiona Enter para salir"
    }
    exit 1
}

Log ""
Log "  ____                    _ _        " Cyan
Log " | __ )  __ _ _ __   __ _(_) |_ ___  " Cyan
Log " |  _ \ / _`` | '_ \ / _`` | | __/ _ \ " Cyan
Log " | |_) | (_| | | | | (_| | | || (_) |" Cyan
Log " |____/ \__,_|_| |_|\__, |_|\__\___/ " Cyan
Log "                       |_|            " Cyan
Log ""

# --- Backend ---
Log "[Backend] Arrancando en http://localhost:8000 ..." Green
$backendJob = Start-Process `
    -FilePath $venvPython `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $backendDir `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# --- Frontend ---
if (Test-Path (Join-Path $frontendDir "package.json")) {
    Log "[Frontend] Arrancando en http://localhost:5173 ..." Green

    $npmCmd = if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }

    $frontendJob = Start-Process `
        -FilePath $npmCmd `
        -ArgumentList "run", "dev" `
        -WorkingDirectory $frontendDir `
        -PassThru -WindowStyle Hidden
} else {
    Log "[Frontend] No hay package.json. Saltando." Yellow
}

# --- Info (solo si hay ventana) ---
Start-Sleep -Seconds 3
Log ""
Log "=== Banquito corriendo ===" Green
Log "  Backend:  http://localhost:8000/api/docs" Cyan
Log "  Frontend: http://localhost:5173" Cyan
Log ""
Log "Presiona Ctrl+C para detener." Yellow
Log ""

# Si hay ventana, abrir browser desde aca (modo directo)
if ($hasWindow) {
    Log "[Browser] Abriendo http://localhost:5173 ..." DarkGray
    Start-Process "http://localhost:5173"
}

# --- Keep alive & Cleanup ---
try {
    $backendJob | Wait-Process
}
finally {
    Log "Deteniendo servidores..." Yellow
    if ($frontendJob -and -not $frontendJob.HasExited) {
        taskkill /PID $frontendJob.Id /T /F 2>$null
    }
    if ($backendJob -and -not $backendJob.HasExited) {
        taskkill /PID $backendJob.Id /T /F 2>$null
    }
}
