"""FastAPI application factory."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.config import configure_logging, get_settings
from app.core.logging import setup_logging
from app.core.rate_limiter import RateLimiterMiddleware
from app.database import create_all_tables

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup → run → shutdown."""
    settings = get_settings()
    setup_logging()
    logger.info("Starting GenAI Content Transformation Platform (Phases 1-4 Production)")

    # Ensure upload directory exists
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        await create_all_tables(settings)
        logger.info("Database tables verified/created.")
    except Exception as exc:
        logger.error("Database initialisation failed: %s", exc)

    yield

    logger.info("Shutting down GenAI Content Transformation Platform")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="GenAI Content Transformation Platform",
        description="Production GenAI Platform: Document Ingestion, Grounded RAG, & AI Verification.",
        version="3.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Add Rate Limiter Middleware
    app.add_middleware(RateLimiterMiddleware, max_requests=200, window_seconds=60)

    # CORS — allow local dev, vercel domains, and configured origins
    import os
    cors_env = os.getenv("CORS_ORIGINS", "")
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    if cors_env:
        for orig in cors_env.split(","):
            orig_clean = orig.strip()
            if orig_clean and orig_clean not in allowed_origins:
                allowed_origins.append(orig_clean)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API router
    app.include_router(v1_router)

    return app


app = create_app()
