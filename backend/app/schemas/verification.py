"""Pydantic schemas for AI Verification API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class VerificationCreateRequest(BaseModel):
    """Input payload for triggering verification."""

    transformation_id: uuid.UUID = Field(description="UUID of the transformation to verify")


class VerifiedClaimSchema(BaseModel):
    """Single claim classification and source evidence match."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    claim_text: str
    classification: str = Field(description="'SUPPORTED', 'PARTIALLY_SUPPORTED', or 'UNSUPPORTED'")
    reasoning: str
    evidence_snippet: Optional[str] = None
    source_chunk_id: Optional[str] = None
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    confidence_score: float


class VerificationReportResponse(BaseModel):
    """Full verification report returned by API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transformation_id: uuid.UUID
    document_id: uuid.UUID
    groundedness_score: float = Field(description="Internal factuality score in range 0.0 - 100.0")
    citation_coverage: float = Field(description="Percentage of claims with source citations")
    total_claims: int
    supported_claims_count: int
    partially_supported_claims_count: int
    unsupported_claims_count: int
    disclaimer: str
    created_at: datetime
    claims: List[VerifiedClaimSchema]
