"""API configuration — environment variables and Supabase client setup."""

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    supabase_url: str = ""
    supabase_key: str = ""  # anon key (for auth flows)
    supabase_service_key: str = ""  # service_role key (bypasses RLS)
    anthropic_api_key: str = ""
    deepgram_api_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_starter_price_id: str = ""
    stripe_team_price_id: str = ""
    project_root: str = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cors_origins: str = "http://localhost:8501,http://localhost:3000"
    inngest_event_key: str = ""  # Only for Inngest Cloud (prod)
    inngest_signing_key: str = ""  # Only for Inngest Cloud (prod)
    claude_model: str = "claude-sonnet-4-6"
    claude_temperature: float = 0.0

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
