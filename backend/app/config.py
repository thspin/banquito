from pydantic_settings import BaseSettings
from functools import lru_cache
import sys


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Banquito API"
    APP_ENV: str = "production"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = ""  # Required: set via environment variable
    
    def model_post_init(self, __context):
        """Validate critical settings after model initialization."""
        if not self.DATABASE_URL:
            error_msg = (
                "CRITICAL: DATABASE_URL environment variable is not set!\n"
                "Please configure it in Vercel Settings → Environment Variables\n"
                "Example: postgresql://user:pass@host/db?sslmode=require"
            )
            print(error_msg, file=sys.stderr)
            if self.APP_ENV == "production":
                raise ValueError(error_msg)
    
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
    
    # Clerk Authentication
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""
    CLERK_AUDIENCE: str = ""
    CLERK_PEM_PUBLIC_KEY: str = ""  # Optional: faster than JWKS fetch
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""  # Required if using webhooks via Cloudflare Tunnel
    TELEGRAM_WEBHOOK_SECRET: str = ""  # Secret to validate webhook requests
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
