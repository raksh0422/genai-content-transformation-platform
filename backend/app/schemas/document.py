"""Pydantic schemas for Document API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class DocumentUploadResponse(BaseModel):
    """Returned immediately after a successful file upload."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_filename: str
    file_extension: str
    file_size_bytes: int
    mime_type: str
    status: str
    created_at: datetime


class DocumentMetadataResponse(BaseModel):
    """Full document metadata including processing results."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_filename: str
    file_extension: str
    file_size_bytes: int
    mime_type: str
    status: Literal["uploaded", "processing", "completed", "failed"]
    page_count: Optional[int]
    word_count: Optional[int]
    chunk_count: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    total: int
    items: List[DocumentMetadataResponse]
