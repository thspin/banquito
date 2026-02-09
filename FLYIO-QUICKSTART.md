# ⚡ Fly.io Quickstart - 10 Minutos

## 🎯 Stack GRATIS
```
Frontend: GitHub Pages
Backend:  Fly.io  
Database: Fly.io PostgreSQL
Costo: $0
```

---

## 🚀 Pasos Rápidos

### 1. Instalar Fly CLI (1 min)
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

Cierra y abre PowerShell de nuevo, luego:
```bash
flyctl version
```

### 2. Crear Cuenta (2 min)
```bash
flyctl auth signup
# Completa en el navegador

flyctl auth login
```

### 3. Crear PostgreSQL (1 min)
```bash
cd c:\Users\pnm19\OneDrive\Documents\Tuli\tuli-python

flyctl postgres create --name banquito-db --region gru --vm-size shared-cpu-1x --volume-size 1
```
✅ Guarda la URL que te dan

### 4. Deploy Backend (3 min)
```bash
# Inicializar
flyctl launch --no-deploy
# App name: banquito-api
# Region: gru
# PostgreSQL: NO
# Redis: NO

# Conectar BD
flyctl postgres attach banquito-db

# Deploy
flyctl deploy
```

### 5. GitHub Pages (2 min)

**A. Habilitar:**
- Ve a https://github.com/thspin/banquito/settings/pages
- Source: **GitHub Actions**

**B. Obtener URL backend:**
```bash
flyctl info
# Copia el Hostname, ej: banquito-api.fly.dev
```

**C. Configurar Secret:**
- https://github.com/thspin/banquito/settings/secrets/actions
- New secret:
  - Name: `VITE_API_URL`
  - Value: `https://banquito-api.fly.dev`

**D. Actualizar CORS:**
```bash
flyctl secrets set FRONTEND_URL=https://thspin.github.io
```

**E. Deploy frontend:**
- https://github.com/thspin/banquito/actions
- Run workflow "Deploy to GitHub Pages"

### 6. Verificar ✅
- Backend: https://banquito-api.fly.dev/docs
- Frontend: https://thspin.github.io/banquito/
- Prueba crear categorías

---

## 📊 URLs Finales

| Componente | URL |
|------------|-----|
| Frontend | https://thspin.github.io/banquito/ |
| Backend | https://banquito-api.fly.dev |
| Docs | https://banquito-api.fly.dev/docs |

---

## 🐛 Si algo falla

```bash
# Ver logs
flyctl logs

# Ver status
flyctl status

# Reiniciar
flyctl apps restart
```

---

## 📚 Guía Completa
Ver: [docs/12-FLYIO-DEPLOY.md](../docs/12-FLYIO-DEPLOY.md)

---

**¡Listo! Todo gratis y sin cold starts molestos.** 🎉
