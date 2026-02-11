from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Banquito API"
    APP_ENV: str = "production"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_q8hzxfpcvj2m@ep-twilight-sound-ai3i3gq1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Convert DATABASE_URL to use asyncpg driver."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url
    
    @property
    def DATABASE_URL_CLEAN(self) -> str:
        """Get clean database URL without sslmode for asyncpg compatibility."""
        import re
        url = self.ASYNC_DATABASE_URL
        # Remove sslmode and channel_binding parameters for asyncpg
        url = re.sub(r'[?&]sslmode=[^&]*', '', url)
        url = re.sub(r'[?&]channel_binding=[^&]*', '', url)
        # Clean up trailing ? or &
        url = re.sub(r'[?&]$', '', url)
        return url
    
    # CORS
    FRONTEND_URL: str = "https://banquito.vercel.app"
    ALLOWED_ORIGINS: list[str] = ["https://banquito.vercel.app", "http://localhost:5173", "http://localhost:3000"]
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Get all allowed CORS origins including FRONTEND_URL."""
        origins = set(self.ALLOWED_ORIGINS)
        origins.add(self.FRONTEND_URL)
        return list(origins)
    
    # Hardcoded user for development (will be replaced with auth later)
    CURRENT_USER_ID: str = "550e8400-e29b-41d4-a716-446655440000"
    CURRENT_USER_EMAIL: str = "demo@banquito.app"
    
    # Clerk Authentication (Defaults for production fallback)
    CLERK_PEM_PUBLIC_KEY: str = ""
    CLERK_ISSUER: str = "https://brief-bee-17.clerk.accounts.dev"
    CLERK_JWKS_URL: str = "https://brief-bee-17.clerk.accounts.dev/.well-known/jwks.json"
    CLERK_AUDIENCE: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
