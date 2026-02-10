# Deploy Banquito to Vercel + Supabase

This guide details how to deploy the Banquito application (FastAPI + Vite) to Vercel and connect it to a Supabase PostgreSQL database.

## Prerequisites

1.  **Vercel Account**: [Sign up here](https://vercel.com/signup).
2.  **Supabase Account**: [Sign up here](https://supabase.com/dashboard/sign-up).
3.  **GitHub Repository**: Ensure this code is pushed to your GitHub account.

## Step 1: Supabase Setup

1.  Create a new project in Supabase.
2.  Go to **Project Settings** -> **Database**.
3.  Copy the **Connection String** (URI). Select "Use connection pooling" with `Session` mode and verify it looks like:
    `postgres://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    *Note: If you use the pooler, you might need `?pgbouncer=true` or use the direct connection for migrations.*
    *Recommendation: For this async Python app, use the **Direct Connection** string first to ensure Alembic migrations work easily, or use the Session pooler port 5432.*
    
    The app expects an async driver `postgresql+asyncpg://`. The `config.py` automatically converts `postgres://` or `postgresql://` to the correct async format, so you can just use the standard connection string.

## Step 2: Vercel Deployment

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
2.  Import your `banquito` repository.
3.  **Framework Preset**: Select **Vite**.
4.  **Root Directory**: Leave as `./` (Root).
5.  **Environment Variables**:
    Add the following variables:
    *   `DATABASE_URL`: Your Supabase connection string.
    *   `APP_ENV`: `production`
    *   `SECRET_KEY`: Generate a random secure string.
    *   `PYTHON_VERSION`: `3.9` (or `3.12` depending on preference, Vercel supports standard versions).
6.  Click **Deploy**.

## Step 3: Database Migrations (Important)

Vercel Serverless Functions do *not* run migrations automatically on deploy in a persistent way (they are ephemeral). You should run migrations locally or via a GitHub Action.

**Run Locally:**
1.  Ensure your `.env` has the production `DATABASE_URL`.
2.  Run:
    ```bash
    cd backend
    alembic upgrade head
    ```

## Troubleshooting

-   **404 on API**: Check `vercel.json` rewrites and ensure `api/index.py` is successfully building.
-   **Database Error**: Verify `DATABASE_URL` in Vercel settings. Ensure you are not using Transaction pooling (6543) with SQLAlchemy without proper setup. Session pooling (5432) or Direct connection is safer.

## Automatic Deployments
Vercel automatically deploys when you push changes to the `main` branch.
