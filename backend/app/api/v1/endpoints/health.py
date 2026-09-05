"""Health and Readiness API route handlers."""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


from datetime import datetime, timezone

@router.get("/health", summary="Basic Health Check")
async def health_check():
    """Return 200 OK for basic container liveness checks."""
    return {
        "status": "ok",
        "service": "GenAI Content Transformation Platform",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/liveness", summary="Container Liveness Probe")
async def liveness_check():
    """Liveness probe confirming service process running."""
    return {"status": "alive"}


@router.get("/health/readiness", summary="Database & System Readiness Probe")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe checking database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {exc}",
        )
