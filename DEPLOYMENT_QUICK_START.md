# Deployment Rápido - Banquito en Vercel (5 minutos)

> Este es un resumen rápido. Para detalles completos, ver [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 1️⃣ Preparar las Credenciales (3 min)

```bash
# A) Base de Datos - Ve a https://neon.tech
# Copia tu CONNECTION STRING

# B) Bot de Telegram - Abre Telegram, busca @BotFather
# /newbot → sigue instrucciones → copia el TOKEN

# C) Secreto del Webhook
openssl rand -hex 32
# Guarda el resultado
```

## 2️⃣ Ir a Vercel y Configrar Variables (1 min)

1. Ve a tu proyecto en https://vercel.com/dashboard
2. Click en **Settings** → **Environment Variables**
3. Añade estas 8 variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | postgresql://... (de Neon) |
| `TELEGRAM_BOT_TOKEN` | 123456:ABC... (de BotFather) |
| `TELEGRAM_WEBHOOK_URL` | `https://tu-app.vercel.app/api/telegram/webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | (de openssl) |
| `FRONTEND_URL` | `https://tu-app.vercel.app` |
| `APP_ENV` | `production` |
| `DEBUG` | `false` |

4. Click **Save**

## 3️⃣ Hacer Deploy (1 min)

```bash
git add .
git commit -m "deployment: configure production environment"
git push origin main
```

Vercel automáticamente detectará los cambios y hará deploy.

## 4️⃣ Registrar Webhook (instant)

Después de que Vercel termine el deploy (~2 min), ejecuta:

```bash
curl -X POST https://api.telegram.org/bot<TU_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-app.vercel.app/api/telegram/webhook",
    "secret_token": "tu-secreto",
    "allowed_updates": ["message", "callback_query", "my_chat_member"],
    "drop_pending_updates": false
  }'
```

Reemplaza `<TU_TOKEN>`, la URL y el secreto con tus valores.

## 5️⃣ Verificar que Todo Funciona

```bash
# Ver si está online
curl https://tu-app.vercel.app/api/health
# Debe retornar: {"status": "ok"}

# Ver si el webhook está registrado
curl https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo
# Debe mostrar tu URL en "url"
```

## 6️⃣ Probar Bot en Telegram

1. Abre Telegram
2. Busca tu bot por nombre/username
3. Envía `/start`
4. Debería responder con mensaje de bienvenida

✅ **¡Listo! Tu bot está 24/7 en Vercel.**

---

## Problemas Comunes

| Error | Solución |
|-------|----------|
| `DATABASE_URL is required` | Faltó añadir DATABASE_URL a Vercel Settings |
| Bot no responde | Re-registra webhook con `setWebhook` |
| 500 Error en `/api/health` | Revisa logs: `vercel logs tu-app --tail` |

---

## URLs Útiles

- **Este Proyecto**: https://github.com/thspin/banquito
- **Guía Completa**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Checklist**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
