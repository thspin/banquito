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
    except Exception as e:
        print(f"Database initialization warning: {e}")
        # Continue even if DB init fails - tables might already exist
    
    yield
    
    # Shutdown
    print("Shutting down Banquito API...")


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    import traceback
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
        "traceback": traceback.format_exc().split("\n")[-10:]  # Last 10 lines
    }
    print(f"ERROR: {error_detail}", file=sys.stderr)
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


# Serve static files (frontend) if available - MUST BE LAST
frontend_path = None
try:
    from fastapi.staticfiles import StaticFiles
    import os
    
    # Try multiple possible locations for the frontend build
    frontend_paths = [
        os.path.join(os.path.dirname(__file__), "../../frontend/dist"),
        os.path.join(os.path.dirname(__file__), "../frontend/dist"),
        os.path.join(os.path.dirname(__file__), "../../dist"),
        "/var/task/frontend/dist",
        "/var/task/dist",
        "frontend/dist",
        "dist",
    ]
    
    for path in frontend_paths:
        if os.path.exists(path) and os.path.exists(os.path.join(path, "index.html")):
            frontend_path = path
            break
    
    if frontend_path:
        print(f"Serving frontend from: {frontend_path}")
        assets_path = os.path.join(frontend_path, "assets")
        index_path = os.path.join(frontend_path, "index.html")
        
        # Mount assets directory
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
        # Root route
        @app.get("/")
        async def serve_frontend():
            from fastapi.responses import FileResponse
            return FileResponse(index_path)
        
        # Catch-all route for SPA - must be last
        @app.get("/{path:path}")
        async def serve_spa(path: str):
            from fastapi.responses import FileResponse
            # Don't catch API routes
            if path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not found")
            # Serve index.html for all other routes (SPA behavior)
            return FileResponse(index_path)
    else:
        print("Frontend build not found, serving API only")
        
        @app.get("/")
        async def root_no_frontend():
            return {
                "message": "Banquito API",
                "status": "API only mode - frontend not built",
                "docs": "/api/docs",
                "health": "/api/health"
            }
except Exception as e:
    print(f"Could not setup static files: {e}")
    
    @app.get("/")
    async def root_error():
        return {
            "message": "Banquito API",
            "status": "Error loading frontend",
            "docs": "/api/docs",
            "health": "/api/health"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
