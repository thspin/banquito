# 🚂 Migración a Railway - Guía Completa

## 📋 Índice
1. [Por qué Railway](#por-qué-railway)
2. [Pasos para Deploy](#pasos-para-deploy)
3. [Configuración de Base de Datos](#configuración-de-base-de-datos)
4. [Variables de Entorno](#variables-de-entorno)
5. [Verificación y Testing](#verificación-y-testing)
6. [Troubleshooting](#troubleshooting)

---

## 🌟 Por qué Railway

**Ventajas sobre Render:**
- ✅ Deploy más rápido (30-60 segundos vs 3-5 minutos)
- ✅ No hay cold starts en el plan gratuito
- ✅ Mejor interfaz de usuario
- ✅ Logs en tiempo real más claros
- ✅ Hasta $5 USD de crédito gratis al mes
- ✅ PostgreSQL incluido sin límite de tiempo

---

## 🚀 Pasos para Deploy

### 1. Crear Cuenta en Railway

1. Ve a https://railway.app
2. Haz clic en **"Start a New Project"**
3. Inicia sesión con GitHub

### 2. Crear Base de Datos PostgreSQL

1. En el dashboard, clic en **"+ New"**
2. Selecciona **"Database"** → **"PostgreSQL"**
3. Espera a que se cree (30 segundos)
4. Clic en la base de datos creada
5. Ve a la pestaña **"Variables"**
6. Copia el valor de **`DATABASE_URL`** (lo necesitarás después)

### 3. Deploy del Backend

#### Opción A: Desde GitHub (Recomendado)

1. En el dashboard, clic en **"+ New"**
2. Selecciona **"GitHub Repo"**
3. Busca y selecciona **`thspin/banquito`**
4. Railway detectará automáticamente que es un proyecto Python
5. Espera a que termine el build (~1 minuto)

#### Opción B: Deploy Manual

1. Instala Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Inicializa el proyecto:
```bash
railway init
```

4. Deploy:
```bash
railway up
```

### 4. Configurar Variables de Entorno

1. En el dashboard de Railway, selecciona tu servicio
2. Ve a la pestaña **"Variables"**
3. Añade las siguientes variables:

```env
# Database - Se generará automáticamente al conectar la BD
DATABASE_URL=postgresql://postgres:password@hostname:port/railway

# App Config
APP_ENV=production
DEBUG=false

# CORS - Actualiza con tu URL de Vercel
FRONTEND_URL=https://tuli-web.vercel.app

# User (hardcoded para testing)
CURRENT_USER_ID=550e8400-e29b-41d4-a716-446655440000
CURRENT_USER_EMAIL=demo@banquito.app

# Railway provee PORT automáticamente
# No necesitas definirlo manualmente
```

### 5. Conectar la Base de Datos al Backend

1. En el dashboard, ve a tu servicio de backend
2. Clic en **"Settings"** → **"Service"**
3. En la sección **"Service Variables"**, clic en **"+ New Variable"**
4. Selecciona **"Add Reference"**
5. Selecciona tu base de datos PostgreSQL
6. Selecciona la variable **`DATABASE_URL`**
7. Esto conectará automáticamente tu backend a la BD

### 6. Forzar Re-deploy

1. Ve a la pestaña **"Deployments"**
2. Clic en el menú ⋮ del último deployment
3. Selecciona **"Redeploy"**
4. Las migraciones se ejecutarán automáticamente

---

## 🗄️ Configuración de Base de Datos

Railway ejecuta las migraciones automáticamente en cada deploy gracias al `start command`:

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Verificar que las Tablas Existen

1. En Railway, selecciona tu base de datos PostgreSQL
2. Clic en la pestaña **"Data"**
3. Deberías ver las siguientes tablas:
   - `users`
   - `categories`
   - `financial_institutions`
   - `financial_products`
   - `transactions`
   - `credit_card_summaries`
   - `services`
   - `service_bills`
   - (y otras...)

### Si las Tablas No Existen

1. Ve a la pestaña **"Deployments"** de tu backend
2. Clic en el deployment más reciente
3. Revisa los logs, deberías ver:
```
INFO  [alembic.runtime.migration] Running upgrade -> xxxxx, initial migration
```

Si no ves esto, ejecuta manualmente:

1. En el dashboard, clic en tu servicio
2. Abre la **"Terminal"** (Keyboard icon)
3. Ejecuta:
```bash
cd backend
alembic upgrade head
```

---

## 🔧 Variables de Entorno

### Variables Requeridas:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://...` (auto) |
| `APP_ENV` | Ambiente | `production` |
| `DEBUG` | Modo debug | `false` |
| `FRONTEND_URL` | URL frontend para CORS | `https://tuli-web.vercel.app` |
| `CURRENT_USER_ID` | ID usuario demo | `550e8400-e29b-41d4-a716-446655440000` |
| `CURRENT_USER_EMAIL` | Email usuario demo | `demo@banquito.app` |

### Variables Automáticas de Railway:

Railway provee automáticamente:
- `PORT` - Puerto donde corre el servidor
- `RAILWAY_ENVIRONMENT` - Ambiente (production/staging)
- `RAILWAY_PROJECT_ID` - ID del proyecto
- etc.

---

## ✅ Verificación y Testing

### 1. Verificar el Deploy

1. Ve a la pestaña **"Settings"** de tu servicio
2. Copia el **"Public Domain"**
3. Abre en tu navegador: `https://tu-servicio.up.railway.app`
4. Deberías ver:
```json
{
  "message": "Welcome to Banquito API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### 2. Probar el Health Check

Abre: `https://tu-servicio.up.railway.app/health`

Deberías ver:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### 3. Probar la Documentación

Abre: `https://tu-servicio.up.railway.app/docs`

Deberías ver Swagger UI con todos los endpoints.

### 4. Probar Endpoint de Categorías

En Swagger:
1. Expande **GET /api/categories**
2. Clic en **"Try it out"**
3. Clic en **"Execute"**
4. Deberías ver una lista (vacía o con categorías)

---

## 🔄 Actualizar Frontend (Vercel)

### 1. Actualizar Variable de Entorno

1. Ve a https://vercel.com
2. Selecciona tu proyecto `tuli-web`
3. Ve a **"Settings"** → **"Environment Variables"**
4. Edita `VITE_API_URL`
5. Cambia a: `https://tu-servicio.up.railway.app`
6. Guarda los cambios

### 2. Re-deploy del Frontend

1. Ve a la pestaña **"Deployments"**
2. Clic en el menú ⋮ del último deployment
3. Selecciona **"Redeploy"**
4. Espera 1-2 minutos

### 3. Probar la Conexión

1. Abre: https://tuli-web.vercel.app
2. Abre DevTools (F12) → Console
3. No deberías ver errores de CORS
4. Ve a Settings y prueba crear categorías

---

## 🐛 Troubleshooting

### Error: "Application failed to respond"

**Causa**: El servidor no está escuchando en el puerto correcto

**Solución**: Asegúrate que el start command use `--port $PORT`

### Error: "relation 'categories' does not exist"

**Causa**: Las migraciones no se ejecutaron

**Solución**:
1. Abre la terminal del servicio en Railway
2. Ejecuta: `cd backend && alembic upgrade head`

### Error: "could not connect to server"

**Causa**: La base de datos no está conectada

**Solución**:
1. Verifica que `DATABASE_URL` esté configurada
2. Verifica que uses el formato correcto: `postgresql://` o `postgresql+asyncpg://`
3. Railway provee la URL con `postgresql://`, FastAPI la convertirá automáticamente

### Error: CORS

**Causa**: `FRONTEND_URL` no coincide con la URL de Vercel

**Solución**:
1. Verifica que `FRONTEND_URL=https://tuli-web.vercel.app` (sin trailing slash)
2. Re-deploy el backend

### Logs No Aparecen

**Solución**:
1. En Railway, ve a tu servicio
2. Haz clic en la pestaña **"Deployments"**
3. Selecciona el deployment activo
4. Los logs deberían aparecer en tiempo real

---

## 💰 Costos y Límites (Plan Gratuito)

### Plan Hobby (Gratuito):
- **$5 USD** de uso gratis al mes
- ~500 horas de ejecución
- PostgreSQL ilimitado
- 1 GB de RAM por servicio
- 1 GB de disco para BD

### Para Proyectos Pequeños:
El plan gratuito es suficiente si:
- Tienes < 1000 requests/día
- No usas muchos recursos de CPU
- La BD es < 1 GB

### Monitorear Uso:
1. Dashboard de Railway
2. Ve a **"Usage"**
3. Revisa cuánto crédito has usado

---

## 📊 Comparación: Render vs Railway

| Feature | Render | Railway |
|---------|--------|---------|
| Deploy Speed | 3-5 min | 30-60 seg |
| Cold Starts | Sí (15 min) | No |
| Free Tier | 750 hrs/mes | $5/mes |
| PostgreSQL | 90 días | Ilimitado |
| Interface | Buena | Excelente |
| Logs | Básicos | En tiempo real |
| CLI | Limitado | Completo |

---

## 🎯 Próximos Pasos

1. ✅ Deploy backend en Railway
2. ✅ Configurar PostgreSQL
3. ✅ Actualizar variables en Vercel
4. ✅ Probar categorías
5. 🔜 Configurar dominio custom (opcional)
6. 🔜 Configurar CI/CD avanzado (opcional)

---

## 📚 Recursos Útiles

- **Railway Docs**: https://docs.railway.app
- **Railway Templates**: https://railway.app/templates
- **Railway Discord**: https://discord.gg/railway
- **Railway Blog**: https://blog.railway.app

---

**¿Listo para hacer el deploy? Sigue los pasos arriba y cualquier problema, revisa el Troubleshooting.** 🚀
