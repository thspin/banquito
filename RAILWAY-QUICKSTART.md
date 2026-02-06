# 🚀 Guía Rápida: Deploy en Railway

## ⚡ Pasos Rápidos (5 minutos)

### 1. Crear Proyecto en Railway
```
1. Ve a https://railway.app
2. Login con GitHub
3. Clic en "Start a New Project"
```

### 2. Crear Base de Datos
```
1. Clic en "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Espera 30 segundos
```

### 3. Deploy desde GitHub
```
1. Clic en "+ New" 
2. Selecciona "GitHub Repo"
3. Busca "thspin/banquito"
4. Selecciona el repo
5. Railway lo detectará automáticamente
```

### 4. Configurar Variables
```
En tu servicio → "Variables" → Añadir:

APP_ENV=production
DEBUG=false
FRONTEND_URL=https://tuli-web.vercel.app
CURRENT_USER_ID=550e8400-e29b-41d4-a716-446655440000
CURRENT_USER_EMAIL=demo@banquito.app
```

### 5. Conectar BD al Backend
```
1. Servicio backend → "Variables"
2. "+ New Variable" → "Add Reference"
3. Selecciona PostgreSQL → DATABASE_URL
```

### 6. Re-deploy
```
1. Pestaña "Deployments"
2. Menú ⋮ → "Redeploy"
3. Espera 1 minuto
```

### 7. Obtener URL
```
1. Settings del servicio
2. Copia "Public Domain"
3. Ej: https://banquito-production.up.railway.app
```

### 8. Actualizar Vercel
```
1. Ve a vercel.com → tu proyecto
2. Settings → Environment Variables
3. Edita VITE_API_URL
4. Valor: https://tu-servicio.up.railway.app
5. Redeploy
```

## ✅ Verificar que Funciona

1. Abre: https://tu-servicio.up.railway.app
2. Deberías ver: `{"message": "Welcome to Banquito API", ...}`
3. Abre: https://tu-servicio.up.railway.app/docs
4. Deberías ver Swagger UI
5. Abre https://tuli-web.vercel.app
6. Prueba crear categorías

## 🐛 Si Algo Falla

Ver: [docs/10-RAILWAY-DEPLOY.md](./10-RAILWAY-DEPLOY.md) - Sección Troubleshooting

---

**¿Todo listo? ¡Adelante!** 🚂
