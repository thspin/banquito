"""
Check Neon (production) database state.
Runs against the Neon URL from config.py default.
"""
import asyncio
import sys
import os
sys.path.insert(0, '.')

# Force using Neon URL (ignore local .env)
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://neondb_owner:npg_q8hzxfpcvj2m@ep-twilight-sound-ai3i3gq1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
os.environ['APP_ENV'] = 'production'

async def check_neon():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    import re

    url = os.environ['DATABASE_URL']
    # Clean URL for asyncpg
    url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    url = re.sub(r'[?&]sslmode=[^&]*', '', url)
    url = re.sub(r'[?&]$', '', url)

    engine = create_async_engine(url, echo=False)

    async with engine.connect() as conn:
        # Check tables
        r = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in r.fetchall()]
        print(f"Tables in Neon DB ({len(tables)}):")
        for t in tables:
            print(f"  - {t}")

        print()

        # Check if financial_institutions exists and count rows
        if 'financial_institutions' in tables:
            r2 = await conn.execute(text("SELECT COUNT(*) FROM financial_institutions"))
            count = r2.scalar()
            print(f"financial_institutions: {count} rows")
        else:
            print("financial_institutions: TABLE DOES NOT EXIST")

        # Check alembic version
        if 'alembic_version' in tables:
            r3 = await conn.execute(text("SELECT version_num FROM alembic_version"))
            versions = [row[0] for row in r3.fetchall()]
            print(f"Alembic version(s): {versions}")

        # Check has_shared_credit_limit column
        if 'financial_institutions' in tables:
            r4 = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'financial_institutions'
                AND column_name = 'has_shared_credit_limit'
            """))
            col = r4.fetchone()
            print(f"has_shared_credit_limit column: {'EXISTS' if col else 'MISSING'}")

    await engine.dispose()

asyncio.run(check_neon())
