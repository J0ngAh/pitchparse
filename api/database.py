"""Supabase client initialization and dependency helpers."""

from fastapi import Request

from api.config import get_settings
from supabase import Client, create_client  # type: ignore[attr-defined]


def get_supabase_from_request(request: Request) -> Client:
    """Get the shared Supabase service client from app state."""
    return request.app.state.supabase


def get_supabase_auth_from_request(request: Request) -> Client:
    """Get the shared Supabase auth client from app state."""
    return request.app.state.supabase_auth


def get_supabase_client() -> Client:
    """Create a Supabase client for use outside request context (background tasks)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_auth_client() -> Client:
    """Create a Supabase client for auth operations outside request context."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)
