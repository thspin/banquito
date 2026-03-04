"""
Banquito API
FastAPI application entry point
"""

from contextlib import asynccontextmanager
import sys

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.telegram_bot import bot, dp, start_bot, setup_webhook
import asyncio


async def ensure_demo_user():
    """Ensure that the hardcoded demo user exists in the database."""
    from app.database import AsyncSessionLocal
    from app.models import User
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as db:
        user_id = uuid.UUID(settings.CURRENT_USER_ID)
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            if not result.scalar_one_or_none():
                print(f"Creating demo user: {settings.CURRENT_USER_EMAIL}")
                user = User(
                    id=user_id,
                    email=settings.CURRENT_USER_EMAIL,
                    name="Usuario Demo"
                )
                db.add(user)
                await db.commit()
        except Exception as e:
            print(f"Could not ensure demo user: {e}")


# Track background tasks so the GC doesn't cancel them
_background_tasks: set = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("Starting up Banquito API...")
    
    # Initialize database tables
    try:
        print("Initializing database...")
        await init_db()
        print("Database initialized")
        
        # Ensure demo user exists
        await ensure_demo_user()
        
        # Start Telegram Bot
        if settings.TELEGRAM_BOT_TOKEN:
            if settings.TELEGRAM_WEBHOOK_URL:
                # Webhook mode: 24/7 on Vercel (event-driven)
                await setup_webhook(
                    settings.TELEGRAM_WEBHOOK_URL,
                    settings.TELEGRAM_WEBHOOK_SECRET,
                )
                print(f"✅ Telegram Bot: webhook mode (24/7 on Vercel)")
                print(f"   Webhook URL: {settings.TELEGRAM_WEBHOOK_URL}")
            else:
                # Polling mode: continuous polling (for local development)
                # We keep a reference in _background_tasks so Python's GC
                # doesn't silently cancel the coroutine.
                task = asyncio.create_task(start_bot())
                _background_tasks.add(task)
                task.add_done_callback(_background_tasks.discard)
                print("✅ Telegram Bot: polling mode (development local)")
        else:
            print("⚠️  Telegram Bot: TELEGRAM_BOT_TOKEN not configured — bot disabled")
    except Exception as e:
        print(f"Database initialization warning: {e}")
        # Continue even if DB init fails - tables might already exist
    
    yield
    
    # Shutdown
    print("Shutting down Banquito API...")
    # Cancel any remaining background tasks
    for task in list(_background_tasks):
        task.cancel()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Personal Finance Management API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app" if settings.APP_ENV == "production" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    import traceback
    
    # Log the full error to stderr (server logs) always
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
        "traceback": traceback.format_exc().split("\n")[-10:]  # Last 10 lines
    }
    print(f"ERROR: {error_detail}", file=sys.stderr)

    # In production, return a generic error message to the client
    if not settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

    # In debug mode, return full details
    return JSONResponse(
        status_code=500,
        content=error_detail
    )


# Import and include routers FIRST (before catch-all routes)
from app.routers import accounts, transactions, summaries, services, categories

app.include_router(accounts.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(summaries.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(categories.router, prefix="/api")


# Telegram webhook endpoint
@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """Receive Telegram updates via webhook."""
    from aiogram.types import Update

    # Validate secret if configured
    if settings.TELEGRAM_WEBHOOK_SECRET:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if secret != settings.TELEGRAM_WEBHOOK_SECRET:
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    body = await request.json()
    update = Update.model_validate(body, context={"bot": bot})
    await dp.feed_update(bot=bot, update=update)
    return JSONResponse(content={"ok": True})


# Basic API routes
@app.get("/api/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Banquito API",
        "version": settings.VERSION,
        "docs": "/api/docs",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


# Static file serving is handled by Vercel's static build output
# No need to serve frontend from Python



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
