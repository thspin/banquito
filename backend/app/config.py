from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Banquito API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/banquito"
    
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
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Get all allowed CORS origins including FRONTEND_URL."""
        origins = set(self.ALLOWED_ORIGINS)
        origins.add(self.FRONTEND_URL)
        # Add Vercel preview deployments
        if self.APP_ENV == "production":
            origins.add("https://*.vercel.app")
        return list(origins)
    
    # Hardcoded user for development (will be replaced with auth later)
    CURRENT_USER_ID: str = "550e8400-e29b-41d4-a716-446655440000"
    CURRENT_USER_EMAIL: str = "demo@banquito.app"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
