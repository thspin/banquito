# Setup Inicial - Tuli Python

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.11** o superior
- **Node.js 18** o superior
- **PostgreSQL 14** o superior
- **Git**

## 🗂️ Estructura del Proyecto

```
tuli-python/
├── backend/                 # FastAPI Application
│   ├── app/
│   │   ├── main.py         # Entry point FastAPI
│   │   ├── config.py       # Configuración
│   │   ├── database.py     # SQLAlchemy setup
│   │   ├── dependencies.py # Inyección de dependencias
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Lógica de negocio
│   ├── alembic/            # Database migrations
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Template variables
│
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client
│   │   ├── types/          # TypeScript definitions
│   │   └── main.tsx        # Entry point React
│   ├── package.json        # Node dependencies
│   └── .env.example        # Template variables
│
└── docs/                   # Documentation
    ├── 00-SETUP.md
    ├── 01-MODELS.md
    └── ...
```

## 🚀 Setup Backend

### 1. Crear Virtual Environment

```bash
cd backend

# Crear venv
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (macOS/Linux)
source venv/bin/activate
```

### 2. Instalar Dependencias

```bash
pip install -r requirements.txt
```

**Dependencias principales:**
- `fastapi` - Web framework
- `sqlalchemy[asyncio]` - ORM async
- `asyncpg` - Driver PostgreSQL async
- `pydantic` - Validación de datos
- `alembic` - Migraciones de BD
- `uvicorn` - ASGI server

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/tuli

# App
APP_ENV=development
DEBUG=true

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173
```

### 4. Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear database
CREATE DATABASE tuli;
CREATE USER tuli_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tuli TO tuli_user;
\q
```

### 5. Correr Migraciones

```bash
alembic upgrade head
```

### 6. Iniciar Servidor

```bash
# Modo desarrollo (con reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Modo producción
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**URLs importantes:**
- API: http://localhost:8000
- Documentación Swagger: http://localhost:8000/docs
- Documentación ReDoc: http://localhost:8000/redoc

## 🚀 Setup Frontend

### 1. Instalar Dependencias

```bash
cd frontend
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Iniciar Servidor

```bash
npm run dev
```

Frontend disponible en: http://localhost:5173

## 🔄 Flujo de Desarrollo

### Desarrollo Local

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # o venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Hacer Cambios en la BD

1. Modificar modelos en `backend/app/models/`
2. Crear migración:
   ```bash
   cd backend
   alembic revision --autogenerate -m "descripcion"
   ```
3. Aplicar migración:
   ```bash
   alembic upgrade head
   ```

### Resetear Base de Datos (Cuidado!)

```bash
cd backend
alembic downgrade base
alembic upgrade head
```

## 🐛 Troubleshooting

### Error: "Module not found"
Asegúrate de estar en el virtual environment:
```bash
which python  # Debe mostrar .../venv/bin/python
```

### Error: "Cannot connect to database"
Verificar PostgreSQL está corriendo:
```bash
# Windows
pg_ctl status

# macOS/Linux
sudo service postgresql status
```

### Error: "Port already in use"
Cambiar el puerto:
```bash
uvicorn app.main:app --reload --port 8001
```

## 📚 Próximos Pasos

1. Lee [01-MODELS.md](01-MODELS.md) para entender la estructura de datos
2. Explora los endpoints en http://localhost:8000/docs
3. Comienza a desarrollar en el frontend

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica variables de entorno
3. Consulta la documentación específica del feature
