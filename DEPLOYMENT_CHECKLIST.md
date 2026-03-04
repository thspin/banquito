# Checklist de Deployment para Banquito en Vercel

Sigue esta lista para asegurar un deployment correcto y que el bot funcione 24/7.

## Fase 1: Preparación (Antes de Vercel)

- [ ] **Base de Datos**
  - [ ] Crear proyecto en https://neon.tech
  - [ ] Copiar CONNECTION STRING
  - [ ] Guardar la URL en lugar seguro

- [ ] **Telegram Bot**
  - [ ] Abrir Telegram y buscar @BotFather
  - [ ] Comando `/newbot`
  - [ ] Dar nombre al bot (e.g., "MiBanquito")
  - [ ] Dar username al bot (e.g., "mibanquito_bot")
  - [ ] Copiar TOKEN recibido
  - [ ] Guardar TOKEN en lugar seguro

- [ ] **Vercel**
  - [ ] Crear cuenta en https://vercel.com (si no tienes)
  - [ ] Conectar tu repositorio GitHub
  - [ ] O tener listo el proyecto para descargar

## Fase 2: Configuración en Vercel

- [ ] **Crear Secrets para Webhook**
  ```bash
  # Generar un secreto aleatorio largo:
  openssl rand -hex 32
  # Guardar el resultado (lo usarás en el siguiente paso)
  ```

- [ ] **Configurar Environment Variables en Vercel**
  - Ir a: Settings → Environment Variables
  - Añadir cada una de estas:

  ```
  DATABASE_URL = postgresql://...
  TELEGRAM_BOT_TOKEN = 123456789:ABC...
  TELEGRAM_WEBHOOK_URL = https://tu-app.vercel.app/api/telegram/webhook
  TELEGRAM_WEBHOOK_SECRET = (el secreto generado con openssl)
  FRONTEND_URL = https://tu-app.vercel.app
  APP_ENV = production
  DEBUG = false
  ```

- [ ] **Deploy inicial**
  ```bash
  git push origin main
  # Vercel detectará los cambios y hará deploy automáticamente
  # O usa: vercel --prod
  ```

## Fase 3: Verificación del Deploy

- [ ] **Verificar que la app está online**
  ```bash
  curl https://tu-app.vercel.app/api/health
  # Debería responder: {"status": "ok"}
  ```

- [ ] **Verificar logs de Vercel**
  ```bash
  vercel logs tu-proyecto-name --tail
  # Debería mostrar: "✅ Telegram Bot: webhook mode (24/7 on Vercel)"
  ```

- [ ] **Verificar que la BD está conectada**
  - Si `/api/health` retorna `{"status": "ok"}`, está funcionando

## Fase 4: Registrar Webhook con Telegram

**⚠️ CRÍTICO**: Sin este paso, el bot NO funcionará en producción.

### Opción A: Usando cURL (Terminal)

```bash
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-app.vercel.app/api/telegram/webhook",
    "secret_token": "tu-secreto-aleatorio",
    "allowed_updates": ["message", "callback_query", "my_chat_member"],
    "drop_pending_updates": false
  }'
```

Reemplaza:
- `<TELEGRAM_BOT_TOKEN>` con tu token real
- `tu-app.vercel.app` con tu URL de Vercel
- `tu-secreto-aleatorio` con el secreto generado

### Opción B: Usando Python Script

```bash
export TELEGRAM_BOT_TOKEN=tu-token
export TELEGRAM_WEBHOOK_URL=https://tu-app.vercel.app/api/telegram/webhook
export TELEGRAM_WEBHOOK_SECRET=tu-secreto

python scripts/register_telegram_webhook.py
```

### Opción C: Postman o insomnia

1. POST a: `https://api.telegram.org/bot{TOKEN}/setWebhook`
2. Body (raw JSON):
   ```json
   {
     "url": "https://tu-app.vercel.app/api/telegram/webhook",
     "secret_token": "tu-secreto",
     "allowed_updates": ["message", "callback_query", "my_chat_member"],
     "drop_pending_updates": false
   }
   ```

## Fase 5: Validación del Bot

- [ ] **Verificar webhook registrado**
  ```bash
  curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
  ```
  
  Debería mostrar:
  ```json
  {
    "ok": true,
    "result": {
      "url": "https://tu-app.vercel.app/api/telegram/webhook",
      "has_custom_certificate": false,
      "pending_update_count": 0,
      "last_error_date": null,
      "last_error_message": null
    }
  }
  ```

- [ ] **Probar bot en Telegram**
  1. Abre Telegram
  2. Busca tu bot por username (e.g., @mibanquito_bot)
  3. Envía: `/start`
  4. Deberías recibir un mensaje de bienvenida

- [ ] **Probar funcionalidad básica**
  1. Envía un número (e.g., `100`)
  2. El bot debería preguntar por descripción
  3. Continúa con el flujo de transacciones

## Fase 6: Monitoreo Continuo

- [ ] **Revisar logs regularmente**
  ```bash
  vercel logs tu-proyecto --tail
  ```

- [ ] **Monitorear errores**
  - Ir a Vercel Dashboard → Deployments → Analytics
  - Buscar "5xx errors" o "bot errors"

- [ ] **Probar bot periódicamente**
  - Envía una transacción de prueba semanal
  - Verifica que la respuesta sea rápida

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Bot no responde en Telegram | 1. Verifica `getWebhookInfo` 2. Revisa logs de Vercel 3. Re-registra webhook |
| `DATABASE_URL is required` | Añade DATABASE_URL a Vercel Environment Variables |
| `TELEGRAM_BOT_TOKEN not configured` | Añade TELEGRAM_BOT_TOKEN a Vercel Environment Variables |
| Webhook retorna 403 Forbidden | Verifica que TELEGRAM_WEBHOOK_SECRET coincida |
| Webhook retorna 500 Error | Revisa logs: `vercel logs --tail` |
| BD connection timeout | 1. Verifica DATABASE_URL 2. Asegúrate de Neon permite Vercel 3. Prueba la conexión local |

## Rollback de Emergencia

Si algo sale mal y necesitas volver a una versión anterior:

```bash
# En Vercel Dashboard:
# 1. Ve a Deployments
# 2. Encuentra el deployment anterior que funcionaba
# 3. Click en "..." → Promote
# 4. Confirma
```

## Validación Final

Marca todo como ✅ antes de considerar el deployment completo:

- [ ] App en Vercel responde en `/api/health`
- [ ] Webhook registrado en Telegram (verifica `getWebhookInfo`)
- [ ] Bot responde a `/start` en Telegram
- [ ] Bot acepta transacciones (números y flujo)
- [ ] Logs de Vercel muestran "webhook mode" iniciado
- [ ] Sin errores 5xx en últimas 24 horas
- [ ] DATABASE_URL conecta correctamente

---

## URLs Útiles

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **Telegram BotFather**: https://t.me/botfather
- **Telegram Bot API Docs**: https://core.telegram.org/bots/api
- **Este Proyecto**: https://github.com/thspin/banquito

## Preguntas Frecuentes

**¿Por qué el bot es 24/7 en Vercel?**
- Webhook mode es event-driven. Vercel ejecuta el código cuando Telegram envía un update.
- No hay polling, así que no cuesta dinero constantemente.
- Es fiable y rápido (respuesta en <1s normalmente).

**¿Qué pasa si hay un error en el bot?**
- Telegram lo reintenta automáticamente.
- Vercel graba todos los logs.
- Puedes ver el error en `vercel logs --tail`.

**¿Puedo cambiar el webhook después?**
```bash
# Simplemente ejecuta setWebhook de nuevo con la nueva URL
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "nueva-url.vercel.app/api/telegram/webhook", "secret_token": "..."}'
```

**¿Cómo elimino el webhook?**
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
```
