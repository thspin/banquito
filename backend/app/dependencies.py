"""Application dependencies for FastAPI."""

from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user_id() -> str:
    """
    Get current user ID.
    
    For now, returns hardcoded user ID.
    In the future, this will validate JWT token and return real user.
    """
    return settings.CURRENT_USER_ID


async def get_current_user():
    """
    Get current user info.
    
    Returns a dict with user info.
    In the future, this will query the database for the user.
    """
    return {
        "id": settings.CURRENT_USER_ID,
        "email": settings.CURRENT_USER_EMAIL,
    }
