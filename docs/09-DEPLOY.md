# Deploy en Producción

## 🚀 Deploy del Backend (Render)

### 1. Crear cuenta en Render
- Ve a https://render.com
- Regístrate con GitHub

### 2. Crear Base de Datos PostgreSQL
1. En el Dashboard, clic en "New +"
2. Selecciona "PostgreSQL"
3. Configura:
   - **Name**: `banquito-db`
   - **Database**: `banquito`
   - **User**: `banquito_user`
4. Clic en "Create Database"
5. Guarda el **Internal Database URL** (lo necesitarás después)

### 3. Deploy del Web Service
1. En el Dashboard, clic en "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name**: `banquito-api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. En "Environment Variables", agrega:
   ```
   DATABASE_URL=<Internal Database URL del paso anterior>
   APP_ENV=production
   DEBUG=false
   FRONTEND_URL=https://banquito-web.vercel.app
   ```
6. Clic en "Create Web Service"

### 4. Ejecutar Migraciones
Una vez deployado, ve a la consola de Render y ejecuta:
```bash
alembic upgrade head
```

O crea un script de inicio que lo haga automáticamente.

---

## 🌐 Deploy del Frontend (Vercel)

### 1. Crear cuenta en Vercel
- Ve a https://vercel.com
- Regístrate con GitHub

### 2. Importar Proyecto
1. Clic en "Add New Project"
2. Importa tu repositorio de GitHub
3. Configura:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En "Environment Variables", agrega:
   ```
   VITE_API_URL=https://banquito-api.onrender.com
   ```
5. Clic en "Deploy"

### 3. Configurar CORS en Backend
Asegúrate de que `FRONTEND_URL` en Render apunte a tu URL de Vercel.

---

## 📋 Checklist Pre-Deploy

### Backend
- [ ] Crear `render.yaml` (ya creado)
- [ ] Verificar que todas las variables de entorno estén configuradas
- [ ] Ejecutar migraciones en la BD de producción
- [ ] Verificar que el puerto use `$PORT` (variable de Render)

### Frontend
- [ ] Crear `vercel.json` (ya creado)
- [ ] Verificar `VITE_API_URL` apunte al backend de producción
- [ ] Probar build local: `npm run build && npm run preview`

---

## 🔧 Troubleshooting

### Error: "Module not found"
Asegúrate de que todas las dependencias estén en `requirements.txt` o `package.json`.

### Error: "Database connection failed"
Verifica que `DATABASE_URL` esté correctamente configurada y que la BD esté en la misma región.

### Error: "CORS"
Verifica que `FRONTEND_URL` en el backend coincida exactamente con la URL de Vercel (incluyendo https://).

### Error: "Migrations not applied"
Conecta a la consola de Render y ejecuta manualmente:
```bash
cd backend
alembic upgrade head
```

---

## 🆓 Consideraciones del Plan Gratuito

### Render (Free)
- **Web Service**: Se duerme después de 15 min de inactividad
- **PostgreSQL**: Se borra después de 90 días si no se actualiza
- **Solución**: Agregar un cron job para hacer ping cada 10 min

### Vercel (Free)
- **Límite**: 100GB de ancho de banda/mes
- **Builds**: 6000 minutos/mes
- **Hobby**: Perfecto para proyectos personales

---

## 🔄 Actualizar Deploy

### Después de cambios en el código:
1. Hacer commit y push a GitHub
2. Render y Vercel se actualizan automáticamente
3. Verificar logs si hay errores

### Para nuevas migraciones:
1. Generar migración local: `alembic revision --autogenerate -m "descripcion"`
2. Commit y push
3. Ejecutar en consola de Render: `alembic upgrade head`

---

## 📊 URLs de Producción

Una vez deployado, tus URLs serán:

- **Backend**: `https://banquito-api.onrender.com`
- **Frontend**: `https://banquito-web.vercel.app`
- **API Docs**: `https://banquito-api.onrender.com/docs`

¡Listo para usar en producción! 🎉
