# Exponer Banquito localmente con Cloudflare Tunnel

Este script te ayudará a crear un túnel seguro para que puedas usar tu Bot de Telegram desde tu teléfono sin necesidad de un servidor público.

## Prerrequisitos

1. Tener una cuenta de Cloudflare (gratis).
2. Tener instalado `cloudflared`. Si no lo tienes, puedes instalarlo con:
   - **Windows (Winget):** `winget install Cloudflare.cloudflared`
   - **macOS (Homebrew):** `brew install cloudflared`

## Pasos

1. **Login:** Ejecuta `cloudflared tunnel login`. Se abrirá un navegador para que autorices.
2. **Crear Túnel:** Ejecuta `cloudflared tunnel create banquito-tunnel`.
3. **Configurar DNS:** Ejecuta `cloudflared tunnel route dns banquito-tunnel <tu-subdominio-elegido>`. 
   - *Ejemplo:* `cloudflared tunnel route dns banquito-tunnel banquito-dev.tudominio.com`
4. **Correr Túnel:**
   ```bash
   cloudflared tunnel run --url http://localhost:8000 banquito-tunnel
   ```

Si no tienes un dominio propio en Cloudflare, puedes usar el método rápido (sin persistencia):
```bash
cloudflared tunnel --url http://localhost:8000
```
Esto te dará una URL tipo `https://random-words.trycloudflare.com` que podrás usar temporalmente.
