"""Activity and audit logging service."""
from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog

logger = logging.getLogger(__name__)


async def log_activity(
    db: AsyncSession,
    event_type: str,
    description: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "success",
    details: Optional[Dict[str, Any]] = None,
) -> Optional[ActivityLog]:
    """
    Persist an activity or administrative audit log entry to the database.
    """
    try:
        activity = ActivityLog(
            id=uuid.uuid4(),
            user_id=user_id,
            user_email=user_email,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            status=status,
            details=details,
        )
        db.add(activity)
        await db.flush()
        return activity
    except Exception as exc:
        logger.error("Failed to record activity log: %s", exc)
        return None
