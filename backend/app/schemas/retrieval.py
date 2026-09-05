"""Pydantic schemas for Semantic Retrieval API."""
from __future__ import annotations

import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RetrievalSearchRequest(BaseModel):
    """Input payload for semantic similarity search."""

    document_id: uuid.UUID = Field(description="UUID of the document to search against")
    query: str = Field(description="Search query string", min_length=1)
    top_k: Optional[int] = Field(default=5, ge=1, le=50, description="Maximum top matches to return")


class RetrievalSearchResultItem(BaseModel):
    """Single matching chunk with similarity score and location metadata."""

    chunk_id: str
    chunk_index: int
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    score: float = Field(description="Cosine similarity score normalized to range [0, 1]")
    text: str
    chunk_type: str


class RetrievalSearchResponse(BaseModel):
    """Response returned by POST /api/v1/retrieval/search."""

    document_id: uuid.UUID
    query: str
    total_results: int
    results: List[RetrievalSearchResultItem]
