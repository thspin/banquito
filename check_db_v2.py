import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import clean_database_url
from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

# Clean the database URL and get connect args
clean_url, connect_args = clean_database_url(settings.ASYNC_DATABASE_URL)

engine = create_async_engine(
    clean_url,
    echo=False,
    connect_args=connect_args,
)
from sqlalchemy import inspect

async def check_tables():
    def get_info(conn):
        inspector = inspect(conn)
        tables = inspector.get_table_names()
        results = {}
        for table in tables:
            columns = [c['name'] for c in inspector.get_columns(table)]
            results[table] = columns
        return results

    async with engine.connect() as conn:
        results = await conn.run_sync(get_info)
        for table, columns in results.items():
            print(f"Table: {table}")
            print(f"Columns: {columns}")
            print("-" * 20)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tables())
