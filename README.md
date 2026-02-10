# banquito

Sistema de gestión financiera personal construido con FastAPI y React.

## 🏗️ Estructura del Proyecto

```
banquito/
├── backend/              # FastAPI Backend
│   ├── app/             
│   │   ├── main.py      # Entry point
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── routers/     # API endpoints
│   │   └── services/    # Business logic
│   ├── alembic/         # Database migrations
│   └── requirements.txt
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── api/         # API client
│   │   └── types/       # TypeScript types
│   └── package.json
└── docs/                # Documentation
```

## 🚀 Quick Start

### Requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

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
# Editar .env con tu DATABASE_URL

# Correr migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload
```

API disponible en: http://localhost:8000
Documentación: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con VITE_API_URL=http://localhost:8000

npm run dev
```

Frontend disponible en: http://localhost:5173

## 📚 Documentación

- [00-SETUP.md](docs/00-SETUP.md) - Setup detallado
- [01-MODELS.md](docs/01-MODELS.md) - Modelos de base de datos
- [02-ACCOUNTS-API.md](docs/02-ACCOUNTS-API.md) - API de cuentas
- [03-TRANSACTIONS-API.md](docs/03-TRANSACTIONS-API.md) - API de transacciones
- [04-SUMMARIES-API.md](docs/04-SUMMARIES-API.md) - API de resúmenes
- [05-SERVICES-API.md](docs/05-SERVICES-API.md) - API de servicios
- [06-FRONTEND-SETUP.md](docs/06-FRONTEND-SETUP.md) - Setup del frontend
- [07-FRONTEND-UI.md](docs/07-FRONTEND-UI.md) - Componentes UI
- [08-FRONTEND-PAGES.md](docs/08-FRONTEND-PAGES.md) - Páginas
- [DEPLOY_VERCEL_NEON.md](docs/DEPLOY_VERCEL_NEON.md) - Guía de deploy (Vercel + Neon) 🚀

**Stack Recomendado:**
- Frontend & Backend: Vercel (Monorepo)
- Database: Neon (Serverless Postgres)

## 🛠️ Stack Tecnológico

**Backend:**
- FastAPI 0.104+
- SQLAlchemy 2.0+ (async)
- PostgreSQL
- Pydantic 2.0+
- Alembic

**Frontend:**
- React 18+
- TypeScript 5.0+
- Vite 5.0+
- Tailwind CSS 3.4+
- TanStack Query
- Axios

## 📝 Licencia

MIT
