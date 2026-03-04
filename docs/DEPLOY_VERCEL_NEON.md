# Deploy Banquito to Vercel + Neon (Serverless Postgres)

This guide details how to deploy the Banquito application to Vercel and connect it to a Neon serverless PostgreSQL database. This is the **recommended stack** for Vercel.

## Why Neon?
- **Serverless**: Scales to zero (saves money).
- **Branching**: You can branch your database like your code.
- **Native Integration**: One-click setup in Vercel.

## Step 1: Vercel Deployment & Neon Integration

1.  **Import Project**: In Vercel, import your `banquito` repository.
2.  **Framework Preset**: Select **Vite**.
3.  **Environment Variables**:
    *   `APP_ENV`: `production`
    *   `SECRET_KEY`: Generate a random secure string.
    *   `PYTHON_VERSION`: `3.9` (Recommended).

4.  **Add Database (Neon)**:
    *   In the Vercel project dashboard, go to the **Storage** tab.
    *   Click **Connect Store** -> **Neon**.
    *   Follow the steps to create a new database.
    *   Vercel will automatically add the `DATABASE_URL`, `PGHOST`, `PGUSER`, etc. to your Environment Variables.
    *   **Important**: Check the added `DATABASE_URL`. It usually starts with `postgres://`. The app automatically handles the conversion to `postgresql+asyncpg://`, so you don't need to change anything!

5.  **Deploy**: If you haven't deployed yet, click Deploy. If you already deployed, go to **Deployments** -> **Redeploy** to pick up the new database variables.

## Step 2: Database Migrations

Since Neon is a fresh database, you need to create the tables. You can do this from your local machine connecting to the remote Neon database.

1.  **Get the Connection String**:
    *   Go to Vercel -> Settings -> Environment Variables.
    *   Reveal and Copy `DATABASE_URL` (or `POSTGRES_URL`).

2.  **Run Migrations Locally**:
    *   In your local terminal, set the variable (temporarily) or update your local `.env`.
    *   **Windows (PowerShell)**:
        ```powershell
        $env:DATABASE_URL="postgres://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require"
        cd backend
        alembic upgrade head
        ```
    *   **Mac/Linux**:
        ```bash
        export DATABASE_URL="postgres://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require"
        cd backend
        alembic upgrade head
        ```

## Troubleshooting

-   **SSL Errors**: Neon requires SSL. The connection string typically includes `?sslmode=require`. Ensure this is present.
-   **Async Driver**: If you see errors about "driver not found", ensure `requirements.txt` includes `asyncpg` (it should be there by default).
