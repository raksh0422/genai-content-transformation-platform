"""Pydantic schemas for Content Transformation API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TransformationCreateRequest(BaseModel):
    """Input payload for generating a document content transformation."""

    document_id: uuid.UUID = Field(description="Target document UUID")
    transformation_type: str = Field(
        description=(
            "Transformation type: 'short_summary', 'executive_summary', "
            "'faq', 'quiz', 'email', 'social_post', or 'presentation_outline'"
        )
    )
    tone: str = Field(default="professional", description="Tone e.g. 'professional', 'executive', 'casual', 'academic'")
    length: str = Field(default="medium", description="Length e.g. 'short', 'medium', 'detailed'")
    query_hint: Optional[str] = Field(default=None, description="Optional search query hint for targeted retrieval")


class SourceChunkCitation(BaseModel):
    """Metadata citation mapping generated content back to original source chunk."""

    chunk_id: str
    chunk_index: int
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    similarity_score: float
    snippet: str


class TransformationResponse(BaseModel):
    """Single transformation payload as returned by API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    transformation_type: str
    tone: str
    length: str
    title: str
    content: str
    structured_output: Optional[Dict[str, Any]] = None
    source_chunks: Optional[List[SourceChunkCitation]] = None
    created_at: datetime


class TransformationListResponse(BaseModel):
    """List of generated transformations for a document."""

    document_id: uuid.UUID
    total: int
    items: List[TransformationResponse]
