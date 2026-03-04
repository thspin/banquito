# setup_tunnel.ps1
# Helper script to run a quick tunnel

Write-Host "🚀 Iniciando Cloudflare Tunnel para Banquito..." -ForegroundColor Cyan

if (!(Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "❌ No se encontró 'cloudflared'. Instálalo con 'winget install Cloudflare.cloudflared'" -ForegroundColor Red
    exit
}

Write-Host "🔗 Generando URL temporal..." -ForegroundColor Yellow
cloudflared tunnel --url http://localhost:8000
