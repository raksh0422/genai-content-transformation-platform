"""Pydantic schemas for Administrator Analytics and Management API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.document import DocumentMetadataResponse
from app.schemas.transformation import TransformationResponse


class OverviewKPI(BaseModel):
    total_users: int
    users_change_percent: Optional[float] = None
    active_users: int
    active_users_change_percent: Optional[float] = None
    total_documents: int
    documents_change_percent: Optional[float] = None
    total_transformations: int
    transformations_change_percent: Optional[float] = None
    successful_transformations: int
    successful_change_percent: Optional[float] = None
    failed_transformations: int
    failed_change_percent: Optional[float] = None
    period_label: str = "Last 30 Days"


class UserGrowthDataPoint(BaseModel):
    date: str
    count: int
    cumulative: int


class DocumentUploadDataPoint(BaseModel):
    date: str
    count: int


class TransformationTypeBreakdown(BaseModel):
    type: str
    label: str
    count: int
    percentage: float


class GenerationStatusBreakdown(BaseModel):
    status: str
    count: int
    percentage: float


class UserEngagementDataPoint(BaseModel):
    date: str
    active_users: int


class PlatformUsageMetrics(BaseModel):
    top_transformation_type: str
    average_duration_seconds: float
    average_transformations_per_user: float
    percentage_users_with_documents: float


class ChartsResponse(BaseModel):
    user_growth: List[UserGrowthDataPoint]
    document_uploads: List[DocumentUploadDataPoint]
    transformation_activity: List[TransformationTypeBreakdown]
    generation_status: List[GenerationStatusBreakdown]
    user_engagement: List[UserEngagementDataPoint]
    platform_usage: PlatformUsageMetrics


class ActivityLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    event_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    description: str
    status: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime


class ActivityLogListResponse(BaseModel):
    total: int
    items: List[ActivityLogItem]


class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_active_at: Optional[datetime] = None
    document_count: int = 0
    transformation_count: int = 0


class AdminUserListResponse(BaseModel):
    total: int
    items: List[AdminUserItem]


class AdminUserDetailResponse(BaseModel):
    user: AdminUserItem
    documents: List[DocumentMetadataResponse]
    recent_transformations: List[TransformationResponse]


class AdminDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_filename: str
    file_extension: str
    file_size_bytes: int
    mime_type: str
    status: str
    user_id: str
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: datetime
    chunk_count: Optional[int] = None
    word_count: Optional[int] = None
    transformation_count: int = 0


class AdminDocumentListResponse(BaseModel):
    total: int
    items: List[AdminDocumentItem]


class AdminTransformationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transformation_type: str
    tone: str
    length: str
    title: str
    status: str
    duration_seconds: Optional[float] = None
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    user_id: str
    user_email: Optional[str] = None
    document_id: uuid.UUID
    document_filename: Optional[str] = None
    created_at: datetime


class AdminTransformationListResponse(BaseModel):
    total: int
    items: List[AdminTransformationItem]
