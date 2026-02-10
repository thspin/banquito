# Database Setup for Production (Neon)

This guide will help you set up the production database using Neon (Serverless PostgreSQL).

## Step 1: Create Neon Account & Database

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up or log in
3. Create a new project
4. Choose:
   - **Region**: Select closest to your users (e.g., `US East`)
   - **PostgreSQL version**: 15 or 16
   - **Project name**: `banquito-prod`

## Step 2: Get Connection String

After creating the project:

1. In the Neon dashboard, click on your project
2. Go to **Connection Details**
3. Copy the connection string (it looks like):
   ```
   postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require
   ```

## Step 3: Configure Environment Variables in Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Select your `banquito` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

### Required Variables

```
DATABASE_URL=postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require
APP_ENV=production
DEBUG=false
FRONTEND_URL=https://your-domain.vercel.app
CURRENT_USER_ID=550e8400-e29b-41d4-a716-446655440000
CURRENT_USER_EMAIL=demo@banquito.app
```

### Optional but Recommended

```
SECRET_KEY=your-random-secret-key-here
```

**Note**: The app automatically converts `postgres://` to `postgresql+asyncpg://` in the code, so you don't need to modify the connection string.

## Step 4: Run Database Migrations

You have two options to run migrations:

### Option A: Run Locally with Production Database

```bash
# Navigate to backend
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Set the production database URL temporarily
# Windows (PowerShell):
$env:DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require"

# macOS/Linux:
export DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito?sslmode=require"

# Run migrations
alembic upgrade head
```

### Option B: Run via Vercel CLI (after first deploy)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Run a one-off command
vercel --prod env pull .env.local

# Then use the DATABASE_URL from .env.local to run migrations locally
```

## Step 5: Verify Database Connection

After running migrations, verify the tables were created:

1. Go to Neon dashboard
2. Click on **SQL Editor**
3. Run:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

You should see all tables: `users`, `categories`, `financial_institutions`, `financial_products`, `transactions`, etc.

## Step 6: Deploy to Vercel

### First Time Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Using Git Integration

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure:
   - **Framework Preset**: Other (monorepo)
   - **Root Directory**: `./`
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
4. Add environment variables from Step 3
5. Deploy

## Troubleshooting

### SSL Connection Errors

If you see SSL errors, ensure your connection string includes `?sslmode=require`.

### Migration Failures

If migrations fail:

1. Check if tables already exist:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
   ⚠️ **Warning**: This deletes ALL data!

2. Or run specific migrations:
   ```bash
   alembic current  # Check current version
   alembic history  # See all migrations
   alembic upgrade +1  # Run next migration
   ```

### CORS Errors

If you see CORS errors in browser:

1. Check `FRONTEND_URL` environment variable matches your actual domain
2. The backend allows multiple origins, but verify in `backend/app/config.py`

### Database Connection Pool Exhausted

Neon free tier has connection limits. If you hit limits:

1. Consider Neon paid tier
2. Or implement connection pooling (PgBouncer)

## Monitoring

- **Neon Dashboard**: Monitor database usage, slow queries
- **Vercel Analytics**: Monitor API response times
- **Vercel Logs**: Check function execution logs

## Backup Strategy

Neon automatically creates daily backups. For additional safety:

```bash
# Export database
pg_dump postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito > backup.sql

# Import database
psql postgres://username:password@ep-xxx.us-east-1.aws.neon.tech/banquito < backup.sql
```

## Next Steps

After successful deployment:

1. ✅ Set up custom domain (optional)
2. ✅ Configure monitoring (Sentry, LogRocket)
3. ✅ Set up automated backups
4. ✅ Implement proper authentication (JWT)
5. ✅ Add rate limiting

---

**Stack**: Vercel + Neon PostgreSQL
**Last Updated**: 2026-02-10
