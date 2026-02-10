#!/usr/bin/env python3
"""Initialize database tables for production."""

import asyncio
import sys
sys.path.insert(0, '.')

from app.database import init_db
from app.config import settings

async def main():
    print("🚀 Initializing database...")
    print(f"Database URL: {settings.ASYNC_DATABASE_URL[:50]}...")
    
    try:
        await init_db()
        print("✅ Database initialized successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
