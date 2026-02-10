#!/usr/bin/env python3
"""
Initialize database tables for production deployment.
Run this script before the first deploy to create all tables.
"""

import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

# Must set this before importing app modules
os.environ['DATABASE_URL'] = "postgresql://neondb_owner:npg_q8hzxfpcvj2m@ep-twilight-sound-ai3i3gq1-pooler.c-4.us-east-1.aws.neon.tech/neondb"

from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base

async def init_database():
    """Create all database tables."""
    print("Initializing database...")
    print(f"Database URL: {os.environ['DATABASE_URL'][:50]}...")
    
    # Create engine with SSL
    import ssl
    ssl_context = ssl.create_default_context()
    
    engine = create_async_engine(
        "postgresql+asyncpg://neondb_owner:npg_q8hzxfpcvj2m@ep-twilight-sound-ai3i3gq1-pooler.c-4.us-east-1.aws.neon.tech/neondb",
        echo=True,
        connect_args={'ssl': ssl_context}
    )
    
    try:
        # Create all tables
        async with engine.begin() as conn:
            print("Creating tables...")
            await conn.run_sync(Base.metadata.create_all)
            print("Tables created successfully!")
            
        # Verify tables were created
        from sqlalchemy import inspect
        
        def get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
        
        async with engine.connect() as conn:
            tables = await conn.run_sync(get_tables)
            print(f"\nTables created: {', '.join(tables)}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()
    
    print("\nDatabase initialization complete!")

if __name__ == "__main__":
    asyncio.run(init_database())
