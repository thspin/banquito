# Banquito 💰

Sistema de gestión financiera personal - FastAPI + React + PostgreSQL.

## 📁 Estructura del Proyecto

```
banquito/
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
└── README.md
```

## ⚡ Quick Start (Local)

### 1. Requisitos
- Python 3.10+
- PostgreSQL
- Node.js & npm

### 2. Backend

1. Entrar al directorio y crear entorno virtual:
```bash
cd backend
python -m venv venv
```

2. Activar entorno virtual (Windows):
```bash
venv\Scripts\activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
   - Crear un archivo `.env` basado en `.env.example`.
   - Asegurarse de que `DATABASE_URL` apunte a tu PostgreSQL local.

5. Ejecutar migraciones:
```bash
alembic upgrade head
```

6. Iniciar servidor:
```bash
uvicorn app.main:app --reload
```
API: http://localhost:8000/api/docs

### 3. Frontend

1. Entrar al directorio e instalar dependencias:
```bash
cd frontend
npm install
```

2. Iniciar el servidor de desarrollo:
```bash
npm run dev
```
Frontend: http://localhost:5173

## 📚 Documentación

- [docs/00-SETUP.md](docs/00-SETUP.md) - Setup detallado local
- [docs/01-MODELS.md](docs/01-MODELS.md) - Modelos de base de datos

## 🛠️ Características

- ✅ Gestión de cuentas bancarias y tarjetas
- ✅ Registro de transacciones (ingresos, gastos, transferencias)
- ✅ Cuotas y Plan Z
- ✅ Resúmenes de tarjetas de crédito
- ✅ Gestión de servicios recurrentes
- ✅ Múltiples monedas (ARS, USD, USDT, USDC, BTC)
- ✅ Dashboard con gráficos
- ✅ Categorías personalizables
- ✅ Bot de Telegram para registro rápido de gastos/ingresos

## 🤖 Bot de Telegram

Registrá gastos e ingresos desde Telegram sin abrir la app.

### Setup

1. Crear un bot con [@BotFather](https://t.me/BotFather) y obtener el token.
2. Agregar al `.env`:
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
```

3. Para webhooks (opcional, requiere URL pública):
```env
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=un_secreto_random
```

### Uso

| Comando | Descripción |
|---------|-------------|
| `1500 Almuerzo` | Registrar gasto/ingreso rápido |
| `/resumen` | Ver saldos de cuentas |
| `/ultimos` | Ver últimas 5 transacciones |
| `/cancelar` | Cancelar operación en curso |
| `/ayuda` | Ver ayuda |

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
