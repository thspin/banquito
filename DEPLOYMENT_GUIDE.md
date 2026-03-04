# Guía de Deployment para Banquito en Vercel

## Configuración Previa Requerida

Antes de hacer deploy, asegúrate de tener:

1. **Cuenta Vercel** (https://vercel.com)
2. **Base de datos Neon PostgreSQL** (https://neon.tech)
3. **Bot de Telegram** creado vía BotFather (@BotFather en Telegram)

---

## Pasos para Deploy Correcto

### 1. Crear Base de Datos en Neon

```bash
# Ve a https://neon.tech y crea un proyecto
# Copia la CONNECTION STRING en formato:
# postgresql://user:password@host/database?sslmode=require
```

### 2. Crear Bot de Telegram

```bash
# Abre Telegram y busca @BotFather
# Comando: /newbot
# Sigue las instrucciones
# Copia el TOKEN recibido (será algo como: 123456789:ABCDefGHIjklMNOpqrsTUVwxyzABC)
```

### 3. Configurar Variables de Entorno en Vercel

En tu proyecto de Vercel, ve a **Settings → Environment Variables** y añade:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIjklMNOpqrsTUVwxyzABC
TELEGRAM_WEBHOOK_URL=https://tu-app.vercel.app/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=tu-secreto-aleatorio-largo
FRONTEND_URL=https://tu-app.vercel.app
APP_ENV=production
```

#### Generar TELEGRAM_WEBHOOK_SECRET

```bash
# En macOS/Linux
openssl rand -hex 32

# Salida ejemplo:
# 8f3k9x2c7m1p5q6r9s2t4u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6
```

### 4. Hacer Deploy desde GitHub

```bash
# Opción A: Push a tu rama main
git add .
git commit -m "chore: deployment configuration"
git push origin main
# Vercel automáticamente detectará los cambios y hará deploy

# Opción B: Deploy manual desde CLI de Vercel
vercel --prod
```

### 5. Registrar Webhook con Telegram

**⚠️ IMPORTANTE:** Después de que Vercel haya hecho deploy exitosamente, ejecuta este script para registrar el webhook:

```bash
# Opción A: Desde tu terminal local
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-app.vercel.app/api/telegram/webhook",
    "secret_token": "tu-secreto-aleatorio-largo",
    "allowed_updates": ["message", "callback_query", "my_chat_member"],
    "drop_pending_updates": false
  }'

# Reemplaza:
# - <TELEGRAM_BOT_TOKEN> con tu token real
# - "https://tu-app.vercel.app" con tu URL de Vercel

# Opción B: Crear un script Python
python scripts/register_telegram_webhook.py
```

### 6. Verificar Estado del Webhook

```bash
curl -X GET https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Deberías ver algo como:

```json
{
  "ok": true,
  "result": {
    "url": "https://tu-app.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "...",
    "last_error_date": null,
    "last_error_message": null,
    "last_synchronization_unix_time": 1234567890
  }
}
```

---

## Verificar que Todo Funciona

### 1. Verificar API

```bash
curl https://tu-app.vercel.app/api/health
# Debería retornar: {"status": "ok"}
```

### 2. Verificar Base de Datos

```bash
# El endpoint /api/health intenta conectar a la BD
# Si retorna status: "ok", la conexión funciona
```

### 3. Verificar Bot de Telegram

1. Abre Telegram
2. Busca tu bot por nombre
3. Envía el comando `/start`
4. Deberías ver el mensaje de bienvenida

---

## Bot 24/7 en Vercel

### Cómo funciona

- **Modo Webhook**: El bot escucha updates via webhook HTTP
- **Serverless Functions**: Vercel ejecuta el código cuando Telegram envía un update
- **Almacenamiento Persistente**: FSM state se guarda en PostgreSQL (NeonStorage)
- **Sin polling**: No hay un proceso corriendo constantemente, es event-driven

### Ventajas

✅ Costo bajo (pagas por ejecución, no por uptime)
✅ Sin máquinas servidores
✅ Escalable automáticamente
✅ Bot disponible 24/7
✅ Rápido (coldstart ~500ms)

---

## Troubleshooting

### Error: "DATABASE_URL is required"

```
Solución: Asegúrate de haber configurado DATABASE_URL en 
Vercel Settings → Environment Variables
```

### Error: "TELEGRAM_BOT_TOKEN is required"

```
Solución: Configura TELEGRAM_BOT_TOKEN en Vercel Environment Variables
```

### El bot no responde

```
Pasos:
1. Verifica que el webhook esté registrado:
   curl -X GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo

2. Revisa los logs de Vercel:
   vercel logs <project-name>

3. Intenta re-registrar el webhook:
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://tu-app.vercel.app/api/telegram/webhook",
       "secret_token": "tu-secreto",
       "drop_pending_updates": true
     }'
```

### Errores de conexión a Base de Datos

```
Pasos:
1. Verifica que DATABASE_URL sea válido
2. Asegúrate de que Neon permite conexiones desde Vercel
3. Revisa los logs: vercel logs <project-name> --tail

Ejemplo de DATABASE_URL válido:
postgresql://neondb_owner:password@ep-xxx-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## Desarrollo Local

Para desarrollar localmente manteniendo la configuración lista para Vercel:

```bash
# Instalar dependencias
cd backend && pip install -r requirements.txt

# Crear archivo .env local
cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://localhost/banquito_dev
TELEGRAM_BOT_TOKEN=your-local-test-token
APP_ENV=development
DEBUG=true
EOF

# Ejecutar servidor local
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Migración de Base de Datos

Si necesitas ejecutar migraciones en producción:

```bash
# Crear una nueva migración
alembic revision --autogenerate -m "descripción del cambio"

# Ver migrations pendientes
alembic current

# Las migraciones se ejecutan automáticamente al startup de la app
# via init_db() en main.py
```

---

## Monitoreo en Producción

### Logs de Vercel

```bash
# Ver últimos logs
vercel logs banquito

# Ver logs en tiempo real
vercel logs banquito --tail

# Filtrar por tipo de error
vercel logs banquito --tail 2>&1 | grep ERROR
```

### Métricas

Visita el dashboard de Vercel para ver:
- Duración de requests
- Errores
- Cold starts
- Uso de CPU/Memoria

---

## Actualizaciones y Rollback

### Hacer una actualización

```bash
git push origin main
# Vercel automáticamente hace deploy
```

### Rollback a versión anterior

En Vercel Dashboard → Deployments → (selecciona deployment anterior) → Promote
