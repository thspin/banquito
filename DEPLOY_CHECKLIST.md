# Checklist de Deploy a Vercel + Neon

## Pre-Deploy Checklist

### 1. Base de Datos Neon ✅

- [ ] Crear cuenta en [https://neon.tech](https://neon.tech)
- [ ] Crear nuevo proyecto
- [ ] Seleccionar región (recomendado: US East o la más cercana a tus usuarios)
- [ ] Copiar connection string
- [ ] **Guardar connection string**: `postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require`

### 2. Variables de Entorno ✅

Variables a configurar en Vercel Dashboard:

**Obligatorias:**
```
DATABASE_URL=postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require
APP_ENV=production
DEBUG=false
FRONTEND_URL=https://tu-app.vercel.app
CURRENT_USER_ID=550e8400-e29b-41d4-a716-446655440000
CURRENT_USER_EMAIL=demo@banquito.app
```

**Opcionales:**
```
SECRET_KEY=tu-clave-secreta-aqui
```

### 3. Migraciones ✅

Ejecutar migraciones en la base de datos de Neon:

```bash
cd backend

# Windows PowerShell:
$env:DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require"
alembic upgrade head

# macOS/Linux:
export DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require"
alembic upgrade head
```

### 4. Dependencias ✅

Verificar que `requirements.txt` tiene todas las dependencias:

```bash
cd backend
pip install -r requirements.txt
```

### 5. Build Local ✅

Probar que el build funciona localmente:

```bash
# Frontend
cd frontend
npm install
npm run build

# Verificar que se creó la carpeta dist/
ls dist/
```

### 6. Archivos de Configuración ✅

Verificar que estos archivos existen:

- [ ] `vercel.json` - Configuración de Vercel
- [ ] `api/index.py` - Entry point del backend
- [ ] `backend/requirements.txt` - Dependencias Python
- [ ] `frontend/package.json` - Scripts de build

## Deploy

### Opción A: Script Automático (Recomendado)

```bash
# Desde la raíz del proyecto
./deploy.sh
```

### Opción B: Vercel CLI

```bash
# Login
npx vercel login

# Deploy preview
npx vercel

# Deploy producción
npx vercel --prod
```

### Opción C: Git Integration

1. Push código a GitHub
2. Importar proyecto en [https://vercel.com/new](https://vercel.com/new)
3. Configurar:
   - Framework: Other
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
4. Agregar variables de entorno
5. Deploy

## Post-Deploy Checklist

### 1. Verificar Deploy ✅

- [ ] Abrir URL de Vercel
- [ ] Verificar que la página carga
- [ ] Verificar que el API responde: `https://tu-app.vercel.app/api/health`
- [ ] Verificar documentación: `https://tu-app.vercel.app/api/docs`

### 2. Verificar Base de Datos ✅

- [ ] Verificar que el usuario demo se creó automáticamente
- [ ] Crear una institución de prueba
- [ ] Crear un producto
- [ ] Crear una transacción

### 3. Verificar Logs ✅

```bash
# Ver logs en tiempo real
npx vercel logs --tail
```

### 4. Configuraciones Adicionales (Opcional) ✅

- [ ] Configurar dominio personalizado
- [ ] Habilitar Analytics de Vercel
- [ ] Configurar monitoreo (Sentry)

## Solución de Problemas

### Error: "relation 'users' does not exist"

**Causa**: No se ejecutaron las migraciones

**Solución**:
```bash
cd backend
export DATABASE_URL="tu-connection-string"
alembic upgrade head
```

### Error: CORS

**Causa**: FRONTEND_URL no coincide con el dominio real

**Solución**: Actualizar variable de entorno FRONTEND_URL en Vercel dashboard

### Error: "Module not found"

**Causa**: Falta instalar dependencias

**Solución**: Verificar que `requirements.txt` está en la raíz del backend

### Error: Database connection timeout

**Causa**: Neon está en modo "scale to zero"

**Solución**: Normal, el primer request después de inactividad tarda más. Esto es normal en Neon free tier.

## Comandos Útiles

```bash
# Ver logs
npx vercel logs --tail

# Listar deployments
npx vercel list

# Promover preview a producción
npx vercel promote <deployment-url>

# Eliminar deployment
npx vercel remove <deployment-url>

# Ver variables de entorno
npx vercel env ls

# Agregar variable
npx vercel env add VARIABLE_NAME
```

## Recursos

- [Neon Documentation](https://neon.tech/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI on Vercel](https://vercel.com/docs/frameworks/fastapi)

## Contacto y Soporte

Si tienes problemas:
1. Revisar logs: `npx vercel logs --tail`
2. Verificar variables de entorno en dashboard
3. Probar localmente primero
4. Revisar [DEPLOY.md](DEPLOY.md) para más detalles

---

**Fecha**: 2026-02-10
**Stack**: Vercel + Neon PostgreSQL
