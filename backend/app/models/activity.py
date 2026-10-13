"""ActivityLog ORM model for administrative audit events and platform metrics."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        index=True,
    )
    user_email: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )  # e.g., 'user_registered', 'user_login', 'document_uploaded', 'transformation_completed', 'transformation_failed', 'admin_action'
    resource_type: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )  # 'user', 'document', 'transformation'
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
    )
    description: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="success",
        index=True,
    )  # 'success', 'failed'
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} event={self.event_type} user={self.user_email}>"
