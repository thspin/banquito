# Tu Primer Deployment de Banquito - Guía Paso a Paso

¡Hola! Si esta es tu primera vez desplegando Banquito en Vercel, esta guía te llevará de la mano.

## ⏱️ Tiempo Total: ~15 minutos

## Paso 0: Antes de Empezar

Asegúrate de tener:
- [ ] Cuenta GitHub (https://github.com)
- [ ] Cuenta Vercel (https://vercel.com) - conectada a tu GitHub
- [ ] Cuenta Neon (https://neon.tech) - o MongoDB Atlas, Supabase, etc.
- [ ] Telegram instalado

---

## Paso 1: Crear Tu Base de Datos (3 minutos)

### 1.1 Ve a Neon Console
1. Abre https://console.neon.tech
2. Click **Create project**
3. Dale un nombre: "banquito-prod"
4. Click **Create project**

### 1.2 Obtén tu CONNECTION STRING
1. En la página principal de tu proyecto, busca **Connection String**
2. Copia la URL que empieza con `postgresql://...`
3. **Guarda en un lugar seguro** (la vas a necesitar en 5 minutos)

Debe verse así:
```
postgresql://neondb_owner:abc123def@ep-xxx-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## Paso 2: Crear Tu Bot de Telegram (2 minutos)

### 2.1 Abrir @BotFather
1. Abre Telegram
2. Busca `@BotFather`
3. Envía: `/newbot`

### 2.2 Responder Preguntas
El bot te preguntará:
- **¿Nombre?** → Escribe: `Mi Banquito`
- **¿Username?** → Escribe: `mi_banquito_bot` (debe ser único)

### 2.3 Copiar Tu Token
El bot responderá algo como:
```
✅ Done! Congratulations on your new bot.
You will find it at t.me/mi_banquito_bot. 
You can now add a description, about section and commands.

Use this token to access the HTTP API:
123456789:ABCDefGHIjklMNOpqrsTUVwxyzABC-12345

Keep your token secure and store it safely!
```

**Copia este token:** `123456789:ABCDefGHIjklMNOpqrsTUVwxyzABC-12345`

---

## Paso 3: Generar Tu Webhook Secret (1 minuto)

Abre tu terminal y ejecuta:

```bash
openssl rand -hex 32
```

Verás algo como:
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def123
```

**Copia este valor** - es tu webhook secret.

---

## Paso 4: Configurar Vercel (2 minutos)

### 4.1 Ir a tu Proyecto Vercel
1. Abre https://vercel.com/dashboard
2. Encuentra **Banquito**
3. Click en él

### 4.2 Ir a Settings
1. Click en **Settings** (en la barra superior)
2. En el menú izquierdo, click **Environment Variables**

### 4.3 Añadir Variables
Ahora añades una por una estas 8 variables:

**1. DATABASE_URL**
- **Key:** `DATABASE_URL`
- **Value:** (la URL de Neon que copiaste)
- Click **Add**

**2. TELEGRAM_BOT_TOKEN**
- **Key:** `TELEGRAM_BOT_TOKEN`
- **Value:** (el token de @BotFather)
- Click **Add**

**3. TELEGRAM_WEBHOOK_URL**
- **Key:** `TELEGRAM_WEBHOOK_URL`
- **Value:** `https://banquito.vercel.app/api/telegram/webhook`
  - (Reemplaza "banquito" con tu nombre de proyecto en Vercel)
- Click **Add**

**4. TELEGRAM_WEBHOOK_SECRET**
- **Key:** `TELEGRAM_WEBHOOK_SECRET`
- **Value:** (el resultado de `openssl rand -hex 32`)
- Click **Add**

**5. FRONTEND_URL**
- **Key:** `FRONTEND_URL`
- **Value:** `https://banquito.vercel.app`
  - (Reemplaza con tu URL de Vercel)
- Click **Add**

**6. APP_ENV**
- **Key:** `APP_ENV`
- **Value:** `production`
- Click **Add**

**7. DEBUG**
- **Key:** `DEBUG`
- **Value:** `false`
- Click **Add**

**8. PYTHON_VERSION** (opcional, pero recomendado)
- **Key:** `PYTHON_VERSION`
- **Value:** `3.11`
- Click **Add**

### 4.4 Guardar
Cuando hayas añadido todas, scroll down y busca **Save** (puede decir "Update" si ya hay variables).

---

## Paso 5: Hacer Deploy (2 minutos)

### 5.1 Ir a tu Terminal
En tu terminal local:

```bash
# Ir a la carpeta del proyecto
cd /path/to/banquito

# Asegurarte de estar en la rama correcta
git checkout main

# Hacer un commit vacío para triggear deploy
git add .
git commit -m "chore: production deployment configuration"

# Subir cambios
git push origin main
```

### 5.2 Esperar a Vercel
1. Vuelve a tu dashboard de Vercel
2. Verás un deployment en progreso (línea con "Loading...")
3. Espera a que termine (debe decir "Ready" en verde)
4. Esto tarda ~2-3 minutos

---

## Paso 6: Registrar El Webhook (1 minuto)

**Esto es CRÍTICO para que el bot funcione.**

Después de que el deployment esté en estado "Ready", ejecuta en tu terminal:

```bash
curl -X POST https://api.telegram.org/bot<TUTOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://banquito.vercel.app/api/telegram/webhook",
    "secret_token": "<TU_SECRETO>",
    "allowed_updates": ["message", "callback_query", "my_chat_member"],
    "drop_pending_updates": false
  }'
```

Reemplaza:
- `<TUTOKEN>` con el token del bot (sin corchetes)
- `https://banquito.vercel.app` con tu URL de Vercel
- `<TU_SECRETO>` con el webhook secret

Debe responder:
```json
{"ok": true, "result": true}
```

Si ves `"ok": false`, hay un error. Ve a Troubleshooting.

---

## Paso 7: Verificar Que Todo Funciona (2 minutos)

### 7.1 Health Check
En tu terminal:

```bash
curl https://banquito.vercel.app/api/health
```

Debe responder:
```json
{"status": "ok"}
```

Si no responde o es un error, la BD no está conectada.

### 7.2 Probar Bot
1. Abre Telegram
2. Busca tu bot (por ejemplo: `@mi_banquito_bot`)
3. Envía: `/start`
4. Deberías recibir un mensaje de bienvenida
5. Envía un número (ejemplo: `100`)
6. El bot debería responder "¿Descripción?"

Si el bot responde: **¡FELICIDADES! 🎉 Tu deployment está completo.**

Si no responde: Ve a Troubleshooting.

---

## Troubleshooting Rápido

### "curl: command not found"
Si estás en Windows y no tienes curl:
- Instalalo: https://curl.se/download.html
- O usa PowerShell en vez de cmd
- O usa Postman: https://www.postman.com/

### "DATABASE_URL is required"
El health check falla. La BD no está conectada.
- Verifica que DATABASE_URL esté en Vercel Settings
- Copia la URL exactamente como viene de Neon
- Haz un nuevo commit: `git commit --allow-empty -m "trigger deploy"`
- Espera a que Vercel haga nuevo deploy

### "Bot no responde en Telegram"
El webhook no está registrado.
- Verifica que el curl retornó `{"ok": true}`
- Ejecuta: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Debe mostrar tu URL
- Si no, re-registra el webhook

### "GET /api/health returns 500"
Hay error en el código.
- Ve a Vercel Dashboard → Deployments → últimas líneas de logs
- Busca "ERROR" o excepciones
- Común: TELEGRAM_BOT_TOKEN o DATABASE_URL mal configurada

### "secret_token mismatch"
El webhook secret no coincide.
- Verifica que copiaste exactamente igual desde `openssl`
- Asegúrate de que el TELEGRAM_WEBHOOK_SECRET en Vercel es el mismo
- Re-registra el webhook

---

## ✅ Checklist Final

Marca cuando hayas completado cada paso:

- [ ] Base de datos creada en Neon
- [ ] CONNECTION STRING copiada
- [ ] Bot creado en @BotFather
- [ ] Token del bot copiado
- [ ] Webhook secret generado con openssl
- [ ] 8 variables configuradas en Vercel
- [ ] Deploy completado (verde en Vercel)
- [ ] Webhook registrado (curl retornó ok: true)
- [ ] Health check responde 200
- [ ] Bot responde a /start en Telegram
- [ ] Bot responde a un número (transacción)

Si todos están marcados: **¡Felicidades! Estás listo para producción! 🚀**

---

## Próximos Pasos

Ahora que tienes todo funcionando:

1. **Aprender más**: Lee [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)
2. **Mantenimiento**: Lee [`BOT_MAINTENANCE_24_7.md`](BOT_MAINTENANCE_24_7.md)
3. **Solución de problemas**: Lee [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

---

## Preguntas Frecuentes Rápidas

**P: ¿Cuesta dinero?**
A: No (al principio). Neon, Vercel y Telegram tienen planes free.

**P: ¿El bot funciona 24/7?**
A: Sí, sin que tengas que hacer nada. Vercel maneja todo.

**P: ¿Qué pasa si algo falla?**
A: Vercel graba los logs. Ve a Dashboard → Deployments → Logs.

**P: ¿Puedo cambiar la configuración después?**
A: Sí, ve a Vercel Settings → Environment Variables y edita.

**P: ¿Cómo actualizo el código?**
A: `git push origin main` y Vercel automáticamente hace deploy.

---

¿Problemas? Ve a [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) → Troubleshooting

¿Listo? **¡Abre Telegram y prueba tu bot!** 🤖
