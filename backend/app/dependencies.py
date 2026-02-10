"""Application dependencies for FastAPI."""

from typing import AsyncGenerator
from uuid import UUID

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


from app.auth import get_current_user_id as get_clerk_user_id

async def get_current_user_id(user_id: str = Depends(get_clerk_user_id)) -> UUID:
    """
    Get current user ID from Clerk token.
    """
    return UUID(user_id)


async def get_current_user(user_id: UUID = Depends(get_current_user_id)):
    """
    Get current user info.
    """
    # Todo: Fetch user details from DB if needed
    return {
        "id": str(user_id),
    }
