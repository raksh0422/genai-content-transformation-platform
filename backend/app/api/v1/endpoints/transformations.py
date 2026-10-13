"""Content Transformation API route handlers."""
from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.auth import User, get_current_user
from app.database import get_db
from app.models.document import Document
from app.schemas.transformation import (
    TransformationCreateRequest,
    TransformationListResponse,
    TransformationResponse,
)
from app.services.transformations.generator import get_transformation_service
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(tags=["transformations"])


@router.post(
    "/transformations/generate",
    response_model=TransformationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Content Transformation",
    description="Generate a source-grounded content transformation (e.g. summary, FAQ, quiz, email, presentation) using RAG.",
)
async def generate_transformation(
    body: TransformationCreateRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
) -> TransformationResponse:
    """Generate and persist a content transformation for an uploaded document."""
    # Check document ownership
    res = await db.execute(select(Document).where(Document.id == body.document_id))
    doc = res.scalar_one_or_none()
    if doc is None or (current_user.role != "admin" and doc.user_id != current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{body.document_id}' not found.",
        )

    tf_svc = get_transformation_service(settings)
    try:
        tf = await tf_svc.generate_transformation(
            db=db,
            document_id=body.document_id,
            transformation_type=body.transformation_type,
            tone=body.tone,
            length=body.length,
            query_hint=body.query_hint,
            user_id=current_user.user_id,
        )
        return TransformationResponse.model_validate(tf)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.exception("Failed to generate transformation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation error: {exc}",
        )


@router.get(
    "/transformations/{transformation_id}",
    response_model=TransformationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Transformation Details",
    description="Retrieve a single generated transformation by ID.",
)
async def get_transformation(
    transformation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
) -> TransformationResponse:
    """Fetch a generated transformation by ID."""
    tf_svc = get_transformation_service(settings)
    tf = await tf_svc.get_transformation(db, transformation_id)
    if tf is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transformation '{transformation_id}' not found.",
        )
    if current_user.role != "admin" and tf.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transformation '{transformation_id}' not found.",
        )
    return TransformationResponse.model_validate(tf)


@router.get(
    "/documents/{document_id}/transformations",
    response_model=TransformationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Document Transformations",
    description="Retrieve all generated content transformations for a specific document.",
)
async def list_document_transformations(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
) -> TransformationListResponse:
    """List all transformations associated with a document."""
    # Check document ownership
    res = await db.execute(select(Document).where(Document.id == document_id))
    doc = res.scalar_one_or_none()
    if doc is None or (current_user.role != "admin" and doc.user_id != current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    tf_svc = get_transformation_service(settings)
    transformations = await tf_svc.list_document_transformations(db, document_id)
    items = [TransformationResponse.model_validate(t) for t in transformations]
    return TransformationListResponse(
        document_id=document_id,
        total=len(items),
        items=items,
    )
