"""Pydantic schemas for DocumentChunk API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ChunkResponse(BaseModel):
    """Single chunk as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    text: str
    token_count: int
    page_number: Optional[int]
    slide_number: Optional[int]
    chunk_type: str
    created_at: datetime


class ChunkListResponse(BaseModel):
    """All chunks for a document."""

    document_id: uuid.UUID
    total_chunks: int
    chunks: List[ChunkResponse]
