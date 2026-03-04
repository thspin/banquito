# Bot de Telegram 24/7 en Vercel - Guía de Mantenimiento

Este documento explica cómo funciona el bot en Vercel y cómo mantenerlo operativo 24/7.

## Cómo Funciona el Bot en Vercel

### Arquitectura: Webhook vs Polling

```
┌─────────────┐
│  Telegram   │
│  Servers    │
└──────┬──────┘
       │ (envía update)
       │ POST /api/telegram/webhook
       ▼
┌─────────────────────────────┐
│  Vercel Serverless Function │
│  (se activa cuando recibe   │
│   update de Telegram)       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  FastAPI + aiogram          │
│  Procesa comando            │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  PostgreSQL (Neon)          │
│  Guarda transacción         │
└─────────────────────────────┘
```

**Ventajas de este modelo:**
- ✅ Bot siempre disponible (24/7)
- ✅ Costo bajo (pagas solo por ejecución)
- ✅ Sin polling constante
- ✅ Respuesta rápida (<1s)
- ✅ Escalable automáticamente

## Verificaciones Diarias

### 1. Health Check (5 seg)

```bash
curl https://tu-app.vercel.app/api/health
```

Debería responder:
```json
{"status": "ok"}
```

### 2. Webhook Status (10 seg)

```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

Busca:
- `"url"`: debe ser tu URL de Vercel
- `"pending_update_count"`: debe ser 0 o bajo
- `"last_error_message"`: debe ser null

### 3. Probar Bot (30 seg)

Envía un mensaje al bot en Telegram:
```
Envía: 100
Espera: respuesta "¿Descripción?"
Envía: prueba
Etc...
```

## Monitoreo Automático

### Logs de Vercel

```bash
# Ver últimos 100 logs
vercel logs tu-app

# Ver en tiempo real
vercel logs tu-app --tail

# Filtrar por errores
vercel logs tu-app --tail 2>&1 | grep -i error
```

### Metrics en Dashboard de Vercel

1. https://vercel.com/dashboard → Tu Proyecto
2. → Analytics
3. Busca:
   - **Response Time**: debe ser <1000ms
   - **5XX Errors**: debe estar vacío
   - **Invocations**: debe tener datos

### Alertas Automáticas (Opcional)

Para que Vercel te alerte si hay problemas:

1. Vercel Dashboard → Settings → Notifications
2. Configura alertas para:
   - Failed Deployments
   - Production Issues

## Solución de Problemas

### Síntoma: Bot no responde

1. Verifica webhook
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   # Si "url" es vacío o diferente, el webhook no está registrado
   ```

2. Re-registra webhook
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://tu-app.vercel.app/api/telegram/webhook",
       "secret_token": "tu-secreto",
       "drop_pending_updates": false
     }'
   ```

3. Revisa logs
   ```bash
   vercel logs tu-app --tail
   # Busca errores de conexión o procesos
   ```

### Síntoma: Bot responde lentamente (>5s)

Probable causa: Cold start de Vercel

```bash
# Mira los logs para confirmar
vercel logs tu-app --tail | grep -i "cold\|start\|duration"

# Los cold starts son normales (<2s), ocurren cuando:
# - Primera invocación después de largo tiempo
# - Actualización de código
# - Vercel apaga la función (raro)

# Solución temporal: hacer un request dummy cada 5 min
# (Vercel tiene un plan Pro que elimina cold starts)
```

### Síntoma: Error 500 en `/api/telegram/webhook`

1. Verifica que DATABASE_URL esté configurada
   ```bash
   vercel env ls
   # Debe mostrar DATABASE_URL
   ```

2. Prueba la conexión a BD
   ```bash
   # En Neon Console, test connection
   # O desde terminal:
   psql <DATABASE_URL>
   ```

3. Revisa logs detallados
   ```bash
   vercel logs tu-app --tail | head -50
   ```

### Síntoma: "secret_token mismatch"

El TELEGRAM_WEBHOOK_SECRET no coincide.

Solución:
```bash
# Opción A: Sin secreto (menos seguro)
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tu-app.vercel.app/api/telegram/webhook"}'

# Opción B: Actualizar secreto en Vercel
# 1. Ir a Vercel Settings → Environment Variables
# 2. Editar TELEGRAM_WEBHOOK_SECRET
# 3. Esperar a nuevo deploy
# 4. Re-registrar webhook con nuevo secreto
```

## Mantenimiento Periódico

### Semanal (5 min)

```bash
# Probar bot manualmente
# Envía al menos una transacción completa

# Revisar logs para warnings
vercel logs tu-app | grep -i warn
```

### Mensual (15 min)

```bash
# Revisar métricas
# 1. Entrar a Vercel Dashboard
# 2. Ver Analytics → Response Time
# 3. Ver Analytics → Invocations
# 4. Buscar anomalías

# Revisar updates de dependencias
# 1. Ir a https://github.com/thspin/banquito
# 2. Pestaña "Security" o "Dependabot"
# 3. Actualizar si hay vulnerabilidades críticas
```

### Trimestral (30 min)

```bash
# Cleanup de logs antiguos (Vercel lo hace automáticamente)

# Auditoría de seguridad
# 1. Cambiar TELEGRAM_WEBHOOK_SECRET
# 2. Re-registrar webhook

# Prueba de rollback
# 1. Ir a Vercel Deployments
# 2. Seleccionar deployment anterior
# 3. Click "Promote"
# 4. Verificar que funciona
# 5. Volver a deployment actual
```

## Escenarios de Emergencia

### El Bot Desapareció de Telegram

```bash
# El token podría estar comprometido
# 1. Generar nuevo token en BotFather
# 2. Actualizar TELEGRAM_BOT_TOKEN en Vercel
# 3. Esperar nuevo deploy
# 4. Re-registrar webhook con nuevo token
```

### Vercel está caído (muy raro)

```bash
# Temporal: migrar a polling local
# 1. Cambiar APP_ENV a "development"
# 2. Ejecutar localmente: uvicorn backend.app.main:app
# 3. El bot funcionará con polling local

# Permanente: esperar a que Vercel se recupere
# O migrar a otro serverless (AWS Lambda, Google Cloud)
```

### Base de Datos está caída

```bash
# Neon ofrece 99.9% uptime, pero:

# Si Neon está caído:
# 1. Telegram intentará reenviar el update
# 2. Tu webhook rechazará (500 error)
# 3. Telegram lo reintentará hasta 24h

# Cuando Neon se recupere:
# - Vercel recibirá los updates nuevamente
# - El bot volverá a funcionar

# Para forzar reintento:
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d '{"url": "https://tu-app.vercel.app/api/telegram/webhook"}'
```

## Métricas de Salud

Ideal que tengas estos números:

| Métrica | Valor Ideal | Rojo 🔴 |
|---------|------------|--------|
| Response Time | <500ms | >5000ms |
| 5XX Errors | 0 | >1% |
| Invocations/día | 50-500 | 0 o >10000 |
| Webhook Errors | 0 | >5% |
| Cold Starts | <1/h | >10/h |

## Actualizar Código en Producción

```bash
# 1. Hacer cambios localmente
git add .
git commit -m "feature: nueva funcionalidad del bot"
git push origin main

# 2. Vercel detecta y hace deploy (~2 min)

# 3. Esperar a que terminen logs
vercel logs tu-app --tail
# Esperar a que diga "Bot ready" o "webhook mode"

# 4. Verificar funcionalidad
curl https://tu-app.vercel.app/api/health

# 5. Probar bot en Telegram
# Envía un comando para verificar que funciona
```

## Rollback de Emergencia

Si algo se rompió tras un deploy:

```bash
# Opción A: Reverter código
git revert HEAD
git push origin main
# Vercel automáticamente hace deploy de versión anterior

# Opción B: Desde Vercel Dashboard
# 1. Ir a Deployments
# 2. Seleccionar deploy anterior que funcionaba
# 3. Click "..." → "Promote to Production"
# 4. Confirmado en 30 segundos
```

## Recursos Adicionales

- **Docs Telegram Bot API**: https://core.telegram.org/bots/api
- **Docs aiogram**: https://docs.aiogram.dev/
- **Docs Vercel**: https://vercel.com/docs
- **Docs Neon**: https://neon.tech/docs
- **Status Page Telegram**: https://status.telegram.org/
- **Status Page Vercel**: https://status.vercel.com/

## Contacto y Soporte

Si hay problemas:

1. Revisa logs: `vercel logs tu-app --tail`
2. Consulta [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. Abre issue en GitHub: https://github.com/thspin/banquito/issues
4. Contacta al equipo: soporte@banquito.app (si existe)
