"""Local JWT verification using Supabase JWKS public key."""

import time

import jwt
import structlog
from jwt import PyJWKClient

from api.config import get_settings

logger = structlog.get_logger()

_jwks_client: PyJWKClient | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL = 3600  # 1 hour


def _get_jwks_client() -> PyJWKClient:
    """Get or create a cached JWKS client for the Supabase project."""
    global _jwks_client, _jwks_cache_time
    now = time.monotonic()
    if _jwks_client is None or (now - _jwks_cache_time) > _JWKS_CACHE_TTL:
        settings = get_settings()
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
        _jwks_cache_time = now
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict | None:
    """Decode and verify a Supabase JWT locally.

    Returns the decoded payload dict on success, None on failure.
    """
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        settings = get_settings()
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated",
            issuer=f"{settings.supabase_url}/auth/v1",
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("jwt_expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("jwt_invalid", error=str(e))
        return None
    except Exception as e:
        logger.warning("jwt_decode_failed", error=str(e))
        return None
