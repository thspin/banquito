# Error Resolution Guide

## Error Encountered on First Deployment

**Error Message:**
```
Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

### What Happened

The `vercel.json` configuration had an invalid runtime specification:
```json
{
  "functions": {
    "api/index.py": {
      "runtime": "python3.11"  // ❌ INVALID FORMAT
    }
  }
}
```

Vercel requires runtimes to use the package name format (e.g., `@vercel/python@4.x`), but attempting to use that also caused issues.

### Solution Applied

We simplified the configuration to let Vercel auto-detect the runtime:

```json
{
  "functions": {
    "api/**/*.py": {
      "maxDuration": 60
    }
  },
  "installCommand": "pip install -r requirements.txt && cd frontend && npm install",
  "buildCommand": "cd frontend && npm run build"
}
```

**Key Changes:**
1. **Removed invalid `runtime` field** - Vercel auto-detects Python from `api/*.py` and `.python-version`
2. **Fixed `installCommand` order** - Python dependencies install first, then frontend
3. **Added `build.sh`** - Provides explicit build instructions
4. **Added `/api/health.py`** - Diagnostics endpoint at `https://your-domain.vercel.app/api/health`

### How Vercel Auto-Detection Works

Vercel will:
1. See `.python-version` file → Use Python 3.12
2. See `requirements.txt` → Install Python dependencies
3. See `api/index.py` → Create serverless function
4. Detect FastAPI `app` object → Use as handler

### Testing the Fix

After re-deploying:

1. **Check build logs** - Should show:
   ```
   Running "vercel build"
   Installing Python dependencies...
   Installing frontend dependencies...
   Building frontend...
   ✅ Deployment successful
   ```

2. **Test health endpoint**:
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "python_version": "3.12.x",
     "app_loaded": true,
     "environment": {
       "DATABASE_URL_SET": true,
       "TELEGRAM_BOT_TOKEN_SET": true
     }
   }
   ```

3. **Test main API**:
   ```bash
   curl https://your-domain.vercel.app/api/
   ```

### Files Modified/Created

- ✅ `vercel.json` - Fixed runtime configuration
- ✅ `build.sh` - Created explicit build script
- ✅ `api/health.py` - Created diagnostics endpoint
- ✅ `.python-version` - Already existed (Python 3.12)
- ✅ `requirements.txt` - Already in root

### If You Still Get Build Errors

**Error: `pip: command not found`**
- Solution: Vercel Python runtime should include pip automatically. Check if `requirements.txt` is in the root directory.

**Error: `npm: command not found` or `node: command not found`**
- Solution: Verify Node.js is available. This shouldn't happen on Vercel.

**Error: `Module not found` for FastAPI**
- Solution: Verify `requirements.txt` includes all dependencies (fastapi, uvicorn, sqlalchemy, asyncpg, aiogram, etc.)

**Error: Import error from `backend/app/main.py`**
- Solution: Check `/api/health.py` endpoint for detailed error messages:
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```
   The response will show the exact import error.

### Next Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Fix: Correct vercel.json runtime configuration"
   git push origin app-deployment
   ```

2. **Trigger redeployment** in Vercel dashboard or via webhook

3. **Monitor build** - Check Vercel dashboard for any errors

4. **Verify functionality**:
   - Test API endpoints
   - Test Telegram bot webhook
   - Check database connection

5. **Set environment variables** - If not already done (see DEPLOYMENT_GUIDE.md)

### Prevention

Future deployments should:
- ✅ Use auto-detected runtimes (don't specify invalid formats)
- ✅ Keep `requirements.txt` in project root
- ✅ Use `.python-version` for explicit Python version
- ✅ Test locally before pushing:
  ```bash
  pip install -r requirements.txt
  cd frontend && npm install && npm run build
  cd ..
  python -m uvicorn backend.app.main:app --reload
  ```

### Questions?

If deployment still fails:
1. Check Vercel build logs (red error messages)
2. Run `/api/health` endpoint for diagnostics
3. Check environment variables are set correctly
4. Verify `requirements.txt` has no syntax errors
5. Ensure `.env` file is in root (not committed to git)
