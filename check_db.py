import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import engine
from sqlalchemy import inspect

async def check_tables():
    def get_tables(conn):
        inspector = inspect(conn)
        return inspector.get_table_names()

    async with engine.connect() as conn:
        tables = await conn.run_sync(get_tables)
        print(f"Tables found: {tables}")
        
        for table in tables:
            def get_columns(conn, table_name):
                inspector = inspect(conn)
                return [c['name'] for c in inspector.get_columns(table_name)]
            
            columns = await conn.run_sync(get_columns, table)
            print(f"Table {table} columns: {columns}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tables())
