"""AI Verification API route handlers."""
from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas.verification import VerificationCreateRequest, VerificationReportResponse
from app.services.verification.verifier import get_verification_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["verification"])


@router.post(
    "/verification/verify",
    response_model=VerificationReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verify Factuality & Groundedness",
    description="Deconstruct generated transformation into claims, retrieve evidence from source document, classify as SUPPORTED/PARTIALLY_SUPPORTED/UNSUPPORTED, and calculate internal Groundedness Score.",
)
async def verify_transformation(
    body: VerificationCreateRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> VerificationReportResponse:
    """Execute claim extraction, evidence retrieval, and verification for a transformation."""
    verify_svc = get_verification_service(settings)
    try:
        report = await verify_svc.verify_transformation(db, body.transformation_id)
        return VerificationReportResponse.model_validate(report)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.exception("Verification processing error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification error: {exc}",
        )


@router.get(
    "/transformations/{transformation_id}/verification",
    response_model=VerificationReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Transformation Verification Report",
    description="Fetch an existing verification report and claim audit log for a transformation.",
)
async def get_verification_report(
    transformation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> VerificationReportResponse:
    """Retrieve an existing verification report by transformation ID."""
    verify_svc = get_verification_service(settings)
    report = await verify_svc.get_verification_report(db, transformation_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No verification report found for transformation '{transformation_id}'.",
        )
    return VerificationReportResponse.model_validate(report)
