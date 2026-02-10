import ssl
import re
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from app.config import settings

def clean_database_url(url: str) -> tuple[str, dict]:
    """Clean database URL and extract SSL/connect args for asyncpg."""
    # Parse URL
    parsed = urlparse(url)
    
    # Parse query parameters
    query_params = parse_qs(parsed.query)
    connect_args = {}
    
    # Check for Neon and handle SSL
    is_neon = 'neon.tech' in parsed.hostname if parsed.hostname else False
    
    if is_neon or 'sslmode' in query_params:
        # For Neon, we need SSL
        connect_args['ssl'] = ssl.create_default_context()
        # Remove sslmode and channel_binding from URL
        query_params.pop('sslmode', None)
        query_params.pop('channel_binding', None)
    
    # Rebuild URL without SSL parameters
    if query_params:
        # Flatten query params for urlencode
        flat_params = {k: v[0] for k, v in query_params.items()}
        new_query = urlencode(flat_params)
    else:
        new_query = ''
    
    # Rebuild URL
    cleaned_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    
    return cleaned_url, connect_args

# Clean the database URL and get connect args
clean_url, connect_args = clean_database_url(settings.ASYNC_DATABASE_URL)

# Create async engine
engine = create_async_engine(
    clean_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    future=True,
    poolclass=NullPool if settings.APP_ENV == "testing" else None,
    connect_args=connect_args,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database - create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
