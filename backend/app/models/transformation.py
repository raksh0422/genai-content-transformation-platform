"""Transformation ORM model for storing generated RAG content outputs."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transformation(Base):
    __tablename__ = "transformations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(256), nullable=False, default="usr_demo_default", index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transformation_type: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )  # short_summary, executive_summary, faq, quiz, email, social_post, presentation_outline
    tone: Mapped[str] = mapped_column(String(32), nullable=False, default="professional")
    length: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Store structured output dictionary (e.g., questions list for FAQ/Quiz, slide cards for presentations)
    structured_output: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Store list of source chunk metadata with scores & snippets for grounded citations
    source_chunks: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    document: Mapped["Document"] = relationship(  # noqa: F821
        "Document",
        back_populates="transformations",
    )

    def __repr__(self) -> str:
        return f"<Transformation id={self.id} doc={self.document_id} type={self.transformation_type}>"
