# 🚀 PLAN DE DEPLOY - GitHub Pages + Railway

## ✅ TODO LISTO - Solo sigue estos pasos

---

## 📦 **PASO 1: Deploy del Backend en Railway** (5 minutos)

### A. Crear cuenta y proyecto
1. Ve a https://railway.app
2. Login con GitHub
3. Clic en "New Project"

### B. Crear Base de Datos
1. Clic en "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Espera 30 segundos ✅

### C. Deploy del Backend
1. Clic en "+ New"
2. Selecciona "GitHub Repo"
3. Busca y selecciona "thspin/banquito"
4. Railway detectará Python automáticamente
5. Espera 1-2 minutos ✅

### D. Configurar Variables
1. En tu servicio backend → pestaña "Variables"
2. Añade estas variables:
   ```
   APP_ENV=production
   DEBUG=false
   FRONTEND_URL=https://thspin.github.io
   CURRENT_USER_ID=550e8400-e29b-41d4-a716-446655440000
   CURRENT_USER_EMAIL=demo@banquito.app
   ```

### E. Conectar Base de Datos
1. Servicio backend → "Variables"
2. "+ New Variable" → "Add Reference"
3. Selecciona PostgreSQL → DATABASE_URL ✅

### F. Obtener URL del Backend
1. Servicio backend → "Settings"
2. Copia el "Public Domain"
3. Ejemplo: `https://banquito-production.up.railway.app`
4. **GUARDA ESTA URL** - la necesitarás en el paso 2

---

## 🌐 **PASO 2: Deploy del Frontend en GitHub Pages** (3 minutos)

### A. Habilitar GitHub Pages
1. Ve a https://github.com/thspin/banquito/settings/pages
2. En "Source" selecciona: **GitHub Actions**
3. ✅ Listo

### B. Configurar URL del Backend
1. Ve a https://github.com/thspin/banquito/settings/secrets/actions
2. Clic en **"New repository secret"**
3. Configura:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://banquito-production.up.railway.app` (tu URL de Railway del paso 1F)
4. Clic en **"Add secret"** ✅

### C. Trigger Deploy
Los archivos ya están en el repo, pero necesitamos los archivos de configuración.
Espera a que termine de crearlos y hacer push.

---

## 🎯 **PASO 3: Verificar que Todo Funciona** (2 minutos)

### A. Verificar Backend
1. Abre: `https://tu-backend.up.railway.app`
2. Deberías ver:
   ```json
   {
     "message": "Welcome to Banquito API",
     "version": "1.0.0",
     "docs": "/docs"
   }
   ```
3. Abre: `https://tu-backend.up.railway.app/docs`
4. Deberías ver Swagger UI ✅

### B. Verificar Frontend
1. Ve a https://github.com/thspin/banquito/actions
2. Espera que el workflow "Deploy Frontend to GitHub Pages" termine (1-2 min)
3. Cuando esté verde ✅, abre: https://thspin.github.io/banquito/
4. ¡Deberías ver tu app funcionando! 🎉

### C. Probar Funcionalidad
1. En la app, ve a "Settings" o "Configuración"
2. Haz clic en **"Crear Categorías por Defecto"**
3. Deberías ver un mensaje de éxito ✅
4. Haz clic en **"+ Nueva Categoría"**
5. Crea una categoría de prueba
6. ¡Debe funcionar! ✅

---

## 📊 **URLs Finales**

| Componente | URL | Costo |
|------------|-----|-------|
| **Frontend** | https://thspin.github.io/banquito/ | **GRATIS** ♾️ |
| **Backend** | https://banquito-production.up.railway.app | **GRATIS** ($5/mes crédito) |
| **API Docs** | https://banquito-production.up.railway.app/docs | **GRATIS** |
| **Database** | Railway PostgreSQL (interno) | **GRATIS** |

**COSTO TOTAL: $0** 🎉

---

## 🐛 **Troubleshooting Rápido**

### ❌ Error: "Failed to fetch" en el frontend
**Causa**: El backend no está corriendo o la URL está mal

**Solución**:
1. Verifica que el backend esté "Live" (verde) en Railway
2. Verifica que `VITE_API_URL` en GitHub Secrets sea correcto
3. Re-ejecuta el workflow de GitHub Actions

### ❌ Error CORS
**Causa**: `FRONTEND_URL` no coincide

**Solución**:
1. En Railway, verifica que `FRONTEND_URL=https://thspin.github.io`
2. (sin /banquito/ al final)
3. Redeploy el backend

### ❌ Error: "relation 'categories' does not exist"
**Causa**: Migraciones no se ejecutaron

**Solución**:
1. En Railway, abre la Terminal del servicio backend
2. Ejecuta: `cd backend && alembic upgrade head`

---

## 📚 **Documentación Completa**

- **Railway**: Ver `RAILWAY-QUICKSTART.md` o `docs/10-RAILWAY-DEPLOY.md`
- **GitHub Pages**: Ver `GITHUB-PAGES-QUICKSTART.md` o `docs/11-GITHUB-PAGES.md`

---

## ✅ **Checklist Final**

- [ ] Backend deployado en Railway
- [ ] PostgreSQL conectado al backend
- [ ] Variables de entorno configuradas en Railway
- [ ] GitHub Pages habilitado
- [ ] Secret `VITE_API_URL` configurado en GitHub
- [ ] Workflow ejecutado exitosamente
- [ ] Frontend accesible en https://thspin.github.io/banquito/
- [ ] App conecta al backend
- [ ] Categorías funcionan

---

**¡Estás a solo 10 minutos de tener tu app completamente online y gratis!** 🚀

Sigue los pasos en orden y cualquier problema, revisa el Troubleshooting.
