"""
Neon-backed FSM storage for aiogram 3.

Stores conversation state in PostgreSQL so the bot can run
in serverless environments (Vercel) without losing flow state.
"""

import json
import logging
from typing import Any, Dict, Optional

from aiogram.fsm.storage.base import BaseStorage, StorageKey

from sqlalchemy import Column, DateTime, String, Text, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime

from app.database import Base, AsyncSessionLocal

logger = logging.getLogger(__name__)


class TelegramState(Base):
    """Stores FSM state per Telegram chat/user."""
    __tablename__ = "telegram_fsm_states"

    key = Column(String(255), primary_key=True)
    state = Column(String(255), nullable=True)
    data = Column(Text, nullable=True)  # JSON serialized
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


def _make_key(key: StorageKey) -> str:
    """Build a unique string key from StorageKey."""
    return f"{key.bot_id}:{key.chat_id}:{key.user_id}"


class NeonStorage(BaseStorage):
    """
    PostgreSQL (Neon) backed storage for aiogram FSM.

    Uses a single row per user with both state and data columns.
    set_state only touches the state column, set_data only touches data.
    """

    async def set_state(self, key: StorageKey, state: Optional[str] = None) -> None:
        db_key = _make_key(key)
        async with AsyncSessionLocal() as db:
            # First check if row exists to get current data
            result = await db.execute(
                select(TelegramState).where(TelegramState.key == db_key)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.state = state
                existing.updated_at = datetime.utcnow()
            else:
                db.add(TelegramState(
                    key=db_key,
                    state=state,
                    data=None,
                    updated_at=datetime.utcnow(),
                ))
            await db.commit()

    async def get_state(self, key: StorageKey) -> Optional[str]:
        db_key = _make_key(key)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TelegramState.state).where(TelegramState.key == db_key)
            )
            state = result.scalar_one_or_none()
            logger.warning(f"[FSM] get_state({db_key}) = {state!r}")
            return state

    async def set_data(self, key: StorageKey, data: Dict[str, Any]) -> None:
        db_key = _make_key(key)
        json_data = json.dumps(data, default=str) if data else None
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TelegramState).where(TelegramState.key == db_key)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.data = json_data
                existing.updated_at = datetime.utcnow()
            else:
                db.add(TelegramState(
                    key=db_key,
                    state=None,
                    data=json_data,
                    updated_at=datetime.utcnow(),
                ))
            await db.commit()

    async def get_data(self, key: StorageKey) -> Dict[str, Any]:
        db_key = _make_key(key)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TelegramState.data).where(TelegramState.key == db_key)
            )
            raw = result.scalar_one_or_none()
            if raw:
                return json.loads(raw)
            return {}

    async def close(self) -> None:
        pass
