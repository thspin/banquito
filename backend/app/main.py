"""
Banquito API
FastAPI application entry point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db


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
                print(f"👤 Creating demo user: {settings.CURRENT_USER_EMAIL}")
                user = User(
                    id=user_id,
                    email=settings.CURRENT_USER_EMAIL,
                    name="Usuario Demo"
                )
                db.add(user)
                await db.commit()
        except Exception as e:
            print(f"⚠️ Could not ensure demo user: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("🚀 Starting up Banquito API...")
    # Ensure demo user exists for a smooth experience
    await ensure_demo_user()
    
    yield
    
    # Shutdown
    print("👋 Shutting down Banquito API...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Personal Finance Management API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Banquito API",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


# Import and include routers
from app.routers import accounts, transactions, summaries, services, categories

app.include_router(accounts.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(summaries.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(categories.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
