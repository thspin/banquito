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


from sqlalchemy import select
from app.models import User

async def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user info, creating the user if they don't exist.
    """
    # Check if user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        # Note: In a real app, you might want to fetch email/name from Clerk API here
        # or pass it via the token claims if custom claims are set up.
        # For now, we create the user with just the ID. Profile info update can happen later.
        user = User(
            id=user_id,
            email=f"user_{str(user_id)[:8]}@placeholder.com", # Placeholder until profile sync
            name="New User"
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except Exception as e:
            await db.rollback()
            # Handle race condition if user created in parallel
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=500, detail="Could not create user record")

    return user
