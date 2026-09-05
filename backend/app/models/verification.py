"""Verification ORM models for storing claim extraction, evidence matching, and factuality scores."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClaimClassification(str, enum.Enum):
    SUPPORTED = "SUPPORTED"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    UNSUPPORTED = "UNSUPPORTED"


class VerificationReport(Base):
    __tablename__ = "verification_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    transformation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transformations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    groundedness_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    citation_coverage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_claims: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    supported_claims_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    partially_supported_claims_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unsupported_claims_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    disclaimer: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        default="Internal application metric. Does not constitute legal, medical, or guaranteed factual truth.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    claims: Mapped[List["VerifiedClaim"]] = relationship(
        "VerifiedClaim",
        back_populates="report",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<VerificationReport id={self.id} score={self.groundedness_score:.1f}% claims={self.total_claims}>"


class VerifiedClaim(Base):
    __tablename__ = "verified_claims"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    classification: Mapped[ClaimClassification] = mapped_column(
        Enum(ClaimClassification, name="claim_classification_enum"),
        nullable=False,
        default=ClaimClassification.UNSUPPORTED,
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_chunk_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    slide_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    report: Mapped["VerificationReport"] = relationship(
        "VerificationReport",
        back_populates="claims",
    )

    def __repr__(self) -> str:
        return f"<VerifiedClaim text='{self.claim_text[:30]}' class={self.classification.value}>"
