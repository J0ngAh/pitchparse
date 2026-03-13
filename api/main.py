"""FastAPI application entry point for PitchParse API."""

import logging
import re
from contextlib import asynccontextmanager

import inngest.fast_api
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from api.config import get_settings
from api.inngest import all_functions, inngest_client
from api.routers import (
    admin,
    analyses,
    auth,
    billing,
    coach,
    dashboard,
    org,
    reports,
    team,
    transcripts,
)

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    from supabase import create_client  # type: ignore[attr-defined]

    app.state.supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    app.state.supabase_auth = create_client(settings.supabase_url, settings.supabase_key)
    yield


app = FastAPI(
    title="PitchParse API",
    description="AI-powered sales call quality assurance",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter

settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


_UUID_PATTERN = re.compile(r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_NO_CACHE_PREFIXES = ("/api/auth", "/api/billing")


@app.middleware("http")
async def cache_control_headers(request: Request, call_next):
    response: Response = await call_next(request)
    path = request.url.path

    if request.method != "GET" or any(path.startswith(p) for p in _NO_CACHE_PREFIXES):
        response.headers["Cache-Control"] = "no-store"
    elif _UUID_PATTERN.search(path):
        response.headers["Cache-Control"] = "public, max-age=300"
    elif path.startswith("/api/"):
        response.headers["Cache-Control"] = "public, max-age=60"

    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger = structlog.get_logger()
    response = await call_next(request)
    await logger.ainfo(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
    )
    return response


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})


# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(transcripts.router, prefix="/api/transcripts", tags=["transcripts"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["analyses"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(org.router, prefix="/api/org", tags=["org"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


# Inngest — mounts /api/inngest for function discovery and execution
inngest.fast_api.serve(app, inngest_client, all_functions)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "pitchparse-api"}
