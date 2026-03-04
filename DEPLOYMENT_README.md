# 📚 Índice de Documentación - Deployment de Banquito

¡Bienvenido! Este es tu punto de entrada para desplegar Banquito en Vercel con el bot 24/7.

## 🚀 Empezar Rápido (5 minutos)

**Si tienes prisa:** Lee [`DEPLOYMENT_QUICK_START.md`](DEPLOYMENT_QUICK_START.md)
- 5 pasos principales
- Ejemplos listos para copiar/pegar
- Links a todas las herramientas necesarias

## 📋 Documentación Completa

### Para Diferentes Audiencias

#### 👨‍💼 Gerente / Product Owner
Lee: [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md)
- Resumen ejecutivo de cambios
- Arquitectura final
- Checklist pre-deploy

#### 👨‍💻 Developer / DevOps
Lee: [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)
- Guía paso a paso detallada
- Configuración de cada servicio
- Troubleshooting completo
- Scripts y ejemplos cURL

#### ✅ Checklist de Implementación
Lee: [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)
- 6 fases de deployment
- Checklist interactivo
- Validaciones post-deploy
- Tabla de troubleshooting rápido

#### 🤖 Bot 24/7 - Mantenimiento
Lee: [`BOT_MAINTENANCE_24_7.md`](BOT_MAINTENANCE_24_7.md)
- Cómo funciona el bot en Vercel
- Verificaciones diarias/semanales/mensuales
- Solución de problemas específicos
- Emergencias y rollback

## 📂 Estructura de Archivos

```
project/
├── DEPLOYMENT_README.md          ← TÚ ESTÁS AQUÍ
├── DEPLOYMENT_QUICK_START.md     (5 min, rápido)
├── DEPLOYMENT_GUIDE.md           (completa, detallada)
├── DEPLOYMENT_CHECKLIST.md       (lista de verificación)
├── DEPLOYMENT_SUMMARY.md         (resumen ejecutivo)
├── BOT_MAINTENANCE_24_7.md       (operaciones diarias)
│
├── .env.example                  (plantilla para dev)
├── .env.production.example       (plantilla para prod)
│
├── requirements.txt              (Python dependencies)
├── vercel.json                   (configuración Vercel)
│
├── backend/
│   ├── app/
│   │   ├── config.py             (env vars validadas)
│   │   ├── main.py               (startup mejorado)
│   │   ├── telegram_bot.py       (bot con webhook)
│   │   └── ...
│   └── requirements.txt
│
├── frontend/
│   ├── package.json
│   └── ...
│
└── scripts/
    └── register_telegram_webhook.py
```

## 🎯 Flujo Recomendado

### Opción A: Principiante (Con mucho tiempo)
1. Leer: `DEPLOYMENT_GUIDE.md` (completa)
2. Seguir: `DEPLOYMENT_CHECKLIST.md` (paso a paso)
3. Mantener: `BOT_MAINTENANCE_24_7.md` (diario)

### Opción B: Intermedio (Tiempo normal)
1. Leer: `DEPLOYMENT_QUICK_START.md` (5 min)
2. Consultar: `DEPLOYMENT_GUIDE.md` (si dudas)
3. Seguir: `DEPLOYMENT_CHECKLIST.md` (verificación)
4. Mantener: `BOT_MAINTENANCE_24_7.md` (diario)

### Opción C: Avanzado (Poco tiempo)
1. Leer: `DEPLOYMENT_SUMMARY.md` (cambios)
2. Copiar: `DEPLOYMENT_QUICK_START.md` (comandos)
3. Ejecutar: `scripts/register_telegram_webhook.py`
4. Verificar: Primeros 5 puntos de `DEPLOYMENT_CHECKLIST.md`

## 🔑 Conceptos Clave

### ¿Qué cambió?
- ✅ `DATABASE_URL` ahora viene de variables de entorno (seguro)
- ✅ `requirements.txt` en raíz (Vercel lo detecta)
- ✅ `vercel.json` configurado para Python 3.11
- ✅ Bot en modo **webhook** (24/7 sin polling)
- ✅ Documentación completa (aquí)

### ¿Cómo funciona el bot 24/7?
```
Telegram envía update
    ↓
POST /api/telegram/webhook
    ↓
Vercel activa serverless function
    ↓
FastAPI procesa comando
    ↓
PostgreSQL guarda transacción
    ↓
Responde a usuario
    ↓
Vercel duerme (costo 0)
```

Sin polling constante, sin servidor siempre encendido, pura magia ✨

### ¿Qué necesito?
1. **Base de datos**: Neon PostgreSQL (free tier disponible)
2. **Bot token**: De @BotFather en Telegram
3. **Hosting**: Vercel (free tier disponible)

## 🚦 Estados del Deployment

### ✅ Todo Bien
- Health check retorna `{"status": "ok"}`
- Bot responde a `/start` en Telegram
- Webhook registrado con `getWebhookInfo`
- Sin errores 5XX en logs

### ⚠️ Problema Potencial
- Health check lento (>2s)
- Bot responde pero lentamente (>5s)
- Logs muestran warnings

### 🔴 Problema Crítico
- Health check retorna 500 error
- Bot no responde en absoluto
- Webhook no registrado
- Logs llenos de excepciones

**Si hay problema crítico:** Ver `DEPLOYMENT_CHECKLIST.md` → Troubleshooting

## 🔧 Herramientas Útiles

```bash
# Ver logs en tiempo real
vercel logs tu-app --tail

# Health check
curl https://tu-app.vercel.app/api/health

# Verificar webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Re-registrar webhook
python scripts/register_telegram_webhook.py

# Ver variables de entorno
vercel env ls

# Ver deployments
vercel deployments list
```

## 📞 Ayuda Rápida

| Pregunta | Respuesta | Ver |
|----------|-----------|-----|
| "¿Cómo hago deploy?" | Leer DEPLOYMENT_QUICK_START.md | 5 min |
| "¿Cuál es la arquitectura?" | Ver DEPLOYMENT_SUMMARY.md | 10 min |
| "¿Algo no funciona?" | Ir a DEPLOYMENT_CHECKLIST.md → Troubleshooting | 15 min |
| "¿Cómo mantengo el bot?" | Leer BOT_MAINTENANCE_24_7.md | 20 min |
| "¿Necesito saber más detalles?" | DEPLOYMENT_GUIDE.md tiene todo | 1 hora |

## 🎓 Videos y Recursos (Opcional)

Si quieres aprender más:
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Aiogram (librería)**: https://docs.aiogram.dev/
- **Vercel Python**: https://vercel.com/docs/functions/serverless-functions/python
- **Neon PostgreSQL**: https://neon.tech/docs

## ✨ Checklist Final Pre-Deploy

```bash
☑️ Lí variables de entorno en Vercel
☑️ DATABASE_URL configurada
☑️ TELEGRAM_BOT_TOKEN configurada
☑️ TELEGRAM_WEBHOOK_URL correcta
☑️ git push origin main
☑️ Esperar a que Vercel termine deploy
☑️ Registrar webhook (cURL o script)
☑️ Probar: curl /api/health
☑️ Probar: /start en Telegram
☑️ Revisar logs: vercel logs --tail
```

## 🚀 Próximo Paso

Dependiendo de tu urgencia:

- ⏱️ **5 minutos**: [`DEPLOYMENT_QUICK_START.md`](DEPLOYMENT_QUICK_START.md)
- ⏱️ **15 minutos**: [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) + [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)
- ⏱️ **30 minutos**: Lee todos los archivos en este índice

---

**¿Preguntas?** Consulta la documentación adecuada o revisa los logs:
```bash
vercel logs tu-app --tail
```

**¿Listo?** Abre [`DEPLOYMENT_QUICK_START.md`](DEPLOYMENT_QUICK_START.md) 🚀
