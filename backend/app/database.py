"""SQLAlchemy async engine and session factory."""
from __future__ import annotations
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_engine = None
_session_factory = None


def _get_engine(settings: Settings):
    global _engine
    if _engine is None:
        is_sqlite = settings.database_url.startswith("sqlite")
        kwargs: dict = {
            "echo": settings.app_env == "development",
        }
        if not is_sqlite:
            kwargs["pool_pre_ping"] = True
            kwargs["pool_size"] = 5
            kwargs["max_overflow"] = 10
        _engine = create_async_engine(settings.database_url, **kwargs)
    return _engine


def _get_session_factory(settings: Settings) -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        engine = _get_engine(settings)
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def create_all_tables(settings: Settings | None = None) -> None:
    """Create all tables (used in tests and initial setup)."""
    global _engine, _session_factory
    if settings is None:
        settings = get_settings()

    try:
        engine = _get_engine(settings)
        async with engine.begin() as conn:
            from app.models import document, chunk, transformation, verification  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables successfully created on %s", settings.database_url)
    except Exception as db_exc:
        if not settings.database_url.startswith("sqlite"):
            logger.warning(
                "PostgreSQL database connection failed (%s). Falling back to local SQLite database: sqlite+aiosqlite:///./genai_platform.db",
                db_exc,
            )
            # Reset engine & session factory to SQLite fallback
            _engine = None
            _session_factory = None
            settings.database_url = "sqlite+aiosqlite:///./genai_platform.db"
            engine = _get_engine(settings)
            async with engine.begin() as conn:
                from app.models import document, chunk, transformation, verification  # noqa: F401
                await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite fallback database successfully initialized.")
        else:
            raise db_exc
    logger.info("Database tables created.")


async def drop_all_tables(settings: Settings | None = None) -> None:
    """Drop all tables (used in tests)."""
    if settings is None:
        settings = get_settings()
    engine = _get_engine(settings)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@asynccontextmanager
async def get_db_session(
    settings: Settings | None = None,
) -> AsyncGenerator[AsyncSession, None]:
    """Async context manager yielding a database session."""
    if settings is None:
        settings = get_settings()
    factory = _get_session_factory(settings)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a DB session."""
    async with get_db_session() as session:
        yield session
