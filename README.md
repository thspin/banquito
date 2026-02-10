# Banquito 💰

Sistema de gestión financiera personal - FastAPI + React + PostgreSQL

## 🚀 Stack de Producción

- **Frontend & Backend**: [Vercel](https://vercel.com) (Serverless)
- **Base de Datos**: [Neon](https://neon.tech) (Serverless PostgreSQL)

## 📁 Estructura del Proyecto

```
banquito/
├── api/
│   └── index.py              # Entry point para Vercel (serverless)
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   └── cache.py         # Caché utilities
│   └── requirements.txt
├── frontend/
│   ├── src/                 # React + TypeScript
│   └── package.json
├── vercel.json              # Configuración de Vercel
├── deploy.sh                # Script de deploy
└── DEPLOY.md               # Guía de deploy completa
```

## ⚡ Quick Start (Local)

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL local

# Crear base de datos PostgreSQL local
createdb banquito

# Migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload
```

API: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con VITE_API_URL=http://localhost:8000

npm run dev
```

Frontend: http://localhost:5173

## 🚀 Deploy a Producción

### Opción 1: Usando el Script (Recomendado)

```bash
# Login a Vercel (primera vez)
npx vercel login

# Ejecutar script de deploy
./deploy.sh
```

### Opción 2: Manual

#### 1. Crear Base de Datos en Neon

1. Ir a [https://neon.tech](https://neon.tech)
2. Crear proyecto nuevo
3. Copiar el connection string

#### 2. Configurar Variables de Entorno

```bash
npx vercel env add DATABASE_URL
# Pegar: postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require

npx vercel env add APP_ENV production
npx vercel env add DEBUG false
npx vercel env add FRONTEND_URL https://tu-app.vercel.app
```

#### 3. Ejecutar Migraciones

```bash
cd backend
export DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require"
alembic upgrade head
```

#### 4. Deploy

```bash
npx vercel --prod
```

## 📚 Documentación

- [DEPLOY.md](DEPLOY.md) - Guía completa de deploy
- [OPTIMIZATIONS.md](OPTIMIZATIONS.md) - Optimizaciones implementadas
- [docs/00-SETUP.md](docs/00-SETUP.md) - Setup detallado local
- [docs/01-MODELS.md](docs/01-MODELS.md) - Modelos de base de datos
- [docs/DEPLOY_VERCEL_NEON.md](docs/DEPLOY_VERCEL_NEON.md) - Guía alternativa de deploy

## 🛠️ Características

- ✅ Gestión de cuentas bancarias y tarjetas
- ✅ Registro de transacciones (ingresos, gastos, transferencias)
- ✅ Cuotas y Plan Z
- ✅ Resúmenes de tarjetas de crédito
- ✅ Gestión de servicios recurrentes
- ✅ Múltiples monedas (ARS, USD, USDT, USDC, BTC)
- ✅ Dashboard con gráficos
- ✅ Categorías personalizables

## 🔧 Tecnologías

**Backend:**
- FastAPI (async)
- SQLAlchemy 2.0 + asyncpg
- PostgreSQL
- Pydantic
- Alembic

**Frontend:**
- React 18
- TypeScript 5
- Vite
- Tailwind CSS
- TanStack Query
- Recharts

**Producción:**
- Vercel (Serverless)
- Neon (PostgreSQL serverless)

## 📝 Licencia

MIT

## 🆘 Soporte

Si encuentras problemas:
1. Revisar [DEPLOY.md](DEPLOY.md) - Troubleshooting
2. Verificar logs: `npx vercel logs --tail`
3. Revisar variables de entorno en Vercel dashboard

---

**Desarrollado con ❤️ para gestionar tus finanzas personales**
