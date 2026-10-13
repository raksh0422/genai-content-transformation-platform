"""Administrator Analytics and Management API endpoints."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.auth import User, require_admin
from app.database import get_db
from app.schemas.admin import (
    ActivityLogListResponse,
    AdminDocumentListResponse,
    AdminTransformationListResponse,
    AdminUserDetailResponse,
    AdminUserItem,
    AdminUserListResponse,
    ChartsResponse,
    OverviewKPI,
)
from app.schemas.auth import UserStatusUpdateRequest
from app.services.activity_service import log_activity
from app.services.admin_service import AdminService
from app.services.document_service import DocumentService
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _get_admin_service() -> AdminService:
    return AdminService()


def _get_storage(settings: Settings = Depends(get_settings)) -> StorageService:
    return StorageService(settings)


def _get_document_service(
    settings: Settings = Depends(get_settings),
    storage: StorageService = Depends(_get_storage),
) -> DocumentService:
    return DocumentService(settings, storage)


# ---------------------------------------------------------------------------
# Analytics Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/analytics/overview",
    response_model=OverviewKPI,
    summary="Get platform KPI overview metrics",
)
async def get_analytics_overview(
    range: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> OverviewKPI:
    """Return top-level platform KPIs with comparisons to previous period."""
    return await admin_service.get_overview_kpis(db, range_str=range)


@router.get(
    "/analytics/charts",
    response_model=ChartsResponse,
    summary="Get analytics charts visualizations data",
)
async def get_analytics_charts(
    range: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> ChartsResponse:
    """Return time-series user growth, uploads, transformation breakdown, and status."""
    return await admin_service.get_charts_data(db, range_str=range)


@router.get(
    "/analytics/activity",
    response_model=ActivityLogListResponse,
    summary="Get recent platform activity and audit events",
)
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> ActivityLogListResponse:
    """Return paginated platform activity records without exposing sensitive document content."""
    items, total = await admin_service.get_recent_activity(
        db, limit=limit, offset=offset, event_type=event_type, status=status
    )
    return ActivityLogListResponse(total=total, items=items)


# ---------------------------------------------------------------------------
# Users Management
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List all registered platform users",
)
async def list_admin_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role: all, user, admin"),
    status: Optional[str] = Query(None, description="Filter by status: all, active, deactivated"),
    sort_by: str = Query("created_at", description="Sort by: created_at, document_count, name, email"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> AdminUserListResponse:
    """Return searchable, paginated user list with aggregated document and generation counts."""
    items, total = await admin_service.list_admin_users(
        db=db,
        search=search,
        role=role,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return AdminUserListResponse(total=total, items=items)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    summary="Get user profile and detailed statistics",
)
async def get_admin_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> AdminUserDetailResponse:
    """Return detailed user profile, uploaded documents list, and transformation history."""
    detail = await admin_service.get_admin_user_detail(db, user_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )
    return detail


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserItem,
    summary="Activate or deactivate a user account",
)
async def update_user_status(
    user_id: str,
    body: UserStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> AdminUserItem:
    """Deactivate or reactivate an account with audit logging."""
    try:
        user = await admin_service.update_user_status(
            db=db,
            user_id=user_id,
            is_active=body.is_active,
            admin_user=current_admin,
        )
        return AdminUserItem.model_validate(user)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )


# ---------------------------------------------------------------------------
# Documents Management
# ---------------------------------------------------------------------------


@router.get(
    "/documents",
    response_model=AdminDocumentListResponse,
    summary="List platform-wide document metadata",
)
async def list_admin_documents(
    search: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> AdminDocumentListResponse:
    """Return platform-wide document metadata without exposing raw private contents."""
    items, total = await admin_service.list_admin_documents(
        db=db,
        search=search,
        file_type=file_type,
        status=status,
        limit=limit,
        offset=offset,
    )
    return AdminDocumentListResponse(total=total, items=items)


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Permanently delete a document across the platform",
)
async def delete_admin_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    doc_service: DocumentService = Depends(_get_document_service),
    current_admin: User = Depends(require_admin),
) -> Response:
    """Delete a document, related chunks, vector index, and transformations with audit log."""
    deleted = await doc_service.delete_document(db, document_id, user_id=None)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    await log_activity(
        db=db,
        event_type="admin_document_deleted",
        description=f"Document {document_id} deleted by administrator {current_admin.email}",
        user_id=current_admin.user_id,
        user_email=current_admin.email,
        resource_type="document",
        resource_id=str(document_id),
        status="success",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Transformations Management
# ---------------------------------------------------------------------------


@router.get(
    "/transformations",
    response_model=AdminTransformationListResponse,
    summary="List platform-wide transformations and generation jobs",
)
async def list_admin_transformations(
    search: Optional[str] = Query(None),
    transformation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_service: AdminService = Depends(_get_admin_service),
    current_admin: User = Depends(require_admin),
) -> AdminTransformationListResponse:
    """Return platform-wide transformations with status, processing duration, and error categories."""
    items, total = await admin_service.list_admin_transformations(
        db=db,
        search=search,
        transformation_type=transformation_type,
        status=status,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return AdminTransformationListResponse(total=total, items=items)
