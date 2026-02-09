# 🚀 Deploy con Fly.io + GitHub Pages - Guía Completa

## ✨ Stack 100% GRATIS
```
Frontend → GitHub Pages (gratis ilimitado)
Backend  → Fly.io (gratis, 3 apps)
Database → Fly.io PostgreSQL (gratis, 3GB permanente)
```

**Costo Total: $0** 🎉

---

## 📦 PASO 1: Instalar Fly CLI (2 minutos)

### Windows PowerShell:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Verificar instalación:
```bash
flyctl version
```

Si no funciona, cierra y abre PowerShell de nuevo.

---

## 🔐 PASO 2: Crear Cuenta y Login (2 minutos)

### A. Sign Up
```bash
flyctl auth signup
```
- Se abrirá el navegador
- Completa el registro (email + contraseña)
- Verifica tu email
- **No necesitas tarjeta de crédito** para empezar

### B. Login
```bash
flyctl auth login
```

---

## 🗄️ PASO 3: Crear Base de Datos PostgreSQL (1 minuto)

```bash
# Navega al directorio del proyecto
cd c:\Users\pnm19\OneDrive\Documents\Tuli\tuli-python

# Crear PostgreSQL
flyctl postgres create --name banquito-db --region gru --vm-size shared-cpu-1x --volume-size 1
```

**Configuración:**
- `--name banquito-db` - Nombre de la BD
- `--region gru` - São Paulo (cerca de Argentina)
- `--vm-size shared-cpu-1x` - Tamaño gratis
- `--volume-size 1` - 1GB (gratis hasta 3GB)

**Guarda estos datos cuando aparezcan:**
- Username: `postgres`
- Password: `[se genera automáticamente]`
- Hostname: `banquito-db.internal`
- Database: `banquito_db`

La URL completa se mostrará, guárdala. Ejemplo:
```
postgres://postgres:password@banquito-db.internal:5432/banquito_db?sslmode=disable
```

---

## 🚀 PASO 4: Deploy del Backend (3 minutos)

### A. Inicializar la app
```bash
flyctl launch --no-deploy
```

**Responde las preguntas:**
1. **App name**: `banquito-api` (o el que prefieras)
2. **Region**: `gru` (São Paulo)
3. **Would you like to set up a Postgresql database?** → **NO** (ya la creamos)
4. **Would you like to set up an Upstash Redis database?** → **NO**

Esto creará/actualizará el `fly.toml` (ya lo tienes configurado).

### B. Conectar la Base de Datos
```bash
flyctl postgres attach banquito-db
```

Esto creará automáticamente la variable `DATABASE_URL`.

### C. Verificar Configuración
Abre `fly.toml` y verifica que tenga:
```toml
app = "banquito-api"
primary_region = "gru"

[env]
  APP_ENV = "production"
  DEBUG = "false"
  FRONTEND_URL = "https://thspin.github.io"
  CURRENT_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
  CURRENT_USER_EMAIL = "demo@banquito.app"
```

### D. Deploy
```bash
flyctl deploy
```

**Tiempo:** 2-3 minutos

**Lo que hace:**
1. ✅ Construye la imagen Docker
2. ✅ Sube la imagen a Fly.io
3. ✅ Ejecuta las migraciones (`alembic upgrade head`)
4. ✅ Inicia el servidor

### E. Verificar Deploy
```bash
# Ver status
flyctl status

# Abrir en navegador
flyctl open
```

Deberías ver:
```json
{
  "message": "Welcome to Banquito API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### F. Ver Logs (opcional)
```bash
flyctl logs
```

---

## 🌐 PASO 5: GitHub Pages (2 minutos)

### A. Habilitar GitHub Pages
1. Ve a https://github.com/thspin/banquito/settings/pages
2. En **Source** selecciona: **GitHub Actions**
3. ✅ Listo

### B. Obtener URL del Backend
```bash
flyctl info
```

Busca la línea `Hostname`, ejemplo:
```
Hostname = banquito-api.fly.dev
```

Tu URL completa será: `https://banquito-api.fly.dev`

### C. Configurar Secret en GitHub
1. Ve a https://github.com/thspin/banquito/settings/secrets/actions
2. Clic en **New repository secret**
3. Configura:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://banquito-api.fly.dev`
4. Clic en **Add secret**

### D. Actualizar CORS en Backend
```bash
flyctl secrets set FRONTEND_URL=https://thspin.github.io
```

### E. Trigger Deploy del Frontend
1. Ve a https://github.com/thspin/banquito/actions
2. Selecciona "Deploy to GitHub Pages"
3. Clic en **Run workflow** → **Run workflow**
4. Espera 2 minutos
5. ✅ Abre: https://thspin.github.io/banquito/

---

## ✅ PASO 6: Verificar que Todo Funciona

### A. Backend
```bash
# Health check
curl https://banquito-api.fly.dev/health

# Ver docs
# Abre en navegador: https://banquito-api.fly.dev/docs
```

### B. Frontend
1. Abre: https://thspin.github.io/banquito/
2. Ve a **Settings/Configuración**
3. Clic en **"Crear Categorías por Defecto"**
4. Si funciona → ✅ TODO PERFECTO

---

## 🎯 URLs Finales

| Componente | URL | Costo |
|------------|-----|-------|
| **Frontend** | https://thspin.github.io/banquito/ | $0 |
| **Backend** | https://banquito-api.fly.dev | $0 |
| **API Docs** | https://banquito-api.fly.dev/docs | $0 |
| **Database** | banquito-db.internal (privada) | $0 |

---

## 📊 Recursos Gratis de Fly.io

```
✅ 3 máquinas shared-cpu-1x (256MB RAM cada una)
✅ 160GB bandwidth/mes
✅ 3GB PostgreSQL storage
✅ Sin cold starts molestos
✅ SSL gratis
✅ Sin límite de tiempo (permanente)
```

**Suficiente para:**
- ~10,000 requests/día
- ~100 usuarios activos
- Proyectos personales/demos

---

## 🔧 Comandos Útiles

### Ver status
```bash
flyctl status
```

### Ver logs en tiempo real
```bash
flyctl logs -a banquito-api
```

### SSH a la máquina
```bash
flyctl ssh console
```

### Escalar (si necesitas más recursos)
```bash
flyctl scale memory 512  # 512MB RAM
flyctl scale count 2     # 2 instancias
```

### Actualizar después de cambios
```bash
git add .
git commit -m "feat: cambios"
git push

# Luego
flyctl deploy
```

### Ver info de la BD
```bash
flyctl postgres db list -a banquito-db
```

### Conectar a PostgreSQL directamente
```bash
flyctl postgres connect -a banquito-db
```

---

## 🐛 Troubleshooting

### Error: "failed to fetch an image"
```bash
# Limpiar caché de Docker
docker system prune -a

# Reintentar
flyctl deploy
```

### Error: "database does not exist"
```bash
# Conectar a la BD
flyctl postgres connect -a banquito-db

# Crear la base de datos
CREATE DATABASE banquito_db;
\q

# Volver a deployar
flyctl deploy
```

### Error: CORS
```bash
# Verificar variables
flyctl secrets list

# Actualizar FRONTEND_URL
flyctl secrets set FRONTEND_URL=https://thspin.github.io

# Verificar que no tenga slash al final
```

### App no responde
```bash
# Ver logs
flyctl logs

# Reiniciar
flyctl apps restart banquito-api
```

### Migraciones no se ejecutaron
```bash
# SSH a la máquina
flyctl ssh console

# Ejecutar manualmente
cd /app
alembic upgrade head
```

---

## 💡 Tips y Mejores Prácticas

### 1. Monitorear uso
```bash
flyctl dashboard
```
Revisa tu uso para asegurarte de estar dentro del plan gratuito.

### 2. Regiones más cercanas a Argentina
- `gru` - São Paulo, Brasil (✅ Recomendado)
- `scl` - Santiago, Chile
- `eze` - Buenos Aires (si está disponible)

### 3. Autoscaling
El `fly.toml` ya está configurado para:
- Auto-stop cuando no hay tráfico (ahorra recursos)
- Auto-start cuando llegan requests
- Min 0 máquinas (plan gratuito)

### 4. Variables de entorno sensibles
```bash
# Usar secrets, no [env] en fly.toml
flyctl secrets set SECRET_KEY=mi-secreto-super-seguro
```

### 5. Backup de Base de Datos
```bash
# Hacer backup manual
flyctl postgres db backup -a banquito-db

# Ver backups
flyctl postgres db list-backups -a banquito-db
```

---

## 🔄 Actualizar la App

### Flujo de desarrollo:
```bash
# 1. Hacer cambios en el código
# 2. Commit
git add .
git commit -m "feat: nueva funcionalidad"
git push

# 3. Deploy a Fly.io
flyctl deploy

# 4. Frontend se actualiza automáticamente en GitHub Actions
```

---

## 📈 Escalar si Creces

Si tu app crece y necesitas más recursos:

### Plan Hobby ($5/mes):
- 1GB RAM
- 10GB storage
- Sin límite de bandwidth

### Comando:
```bash
flyctl scale vm shared-cpu-1x --memory 1024
```

---

## ✅ Checklist Final

- [ ] Fly CLI instalado
- [ ] Cuenta creada y login exitoso
- [ ] PostgreSQL creada
- [ ] Backend deployado
- [ ] Variables configuradas
- [ ] GitHub Pages habilitado
- [ ] Secret `VITE_API_URL` configurado
- [ ] Frontend desplegado
- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente
- [ ] Categorías se pueden crear

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa logs: `flyctl logs`
2. Consulta docs: https://fly.io/docs
3. Community: https://community.fly.io/
4. Discord: https://fly.io/discord

---

**¡Todo listo! Sigue los pasos y en 10 minutos tendrás tu app online GRATIS.** 🚀
