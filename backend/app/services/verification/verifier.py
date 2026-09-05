"""Claim Verification Service.

Classifies claims into SUPPORTED, PARTIALLY_SUPPORTED, or UNSUPPORTED,
calculates the internal Groundedness Score and Citation Coverage, and persists
verification reports in PostgreSQL.
"""
from __future__ import annotations

import logging
import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models.transformation import Transformation
from app.models.verification import ClaimClassification, VerificationReport, VerifiedClaim
from app.services.retrieval_service import get_retrieval_service
from app.services.verification.claim_extractor import ClaimExtractionService
from app.services.verification.evidence_retriever import EvidenceRetrievalService

logger = logging.getLogger(__name__)


class VerificationService:
    """Orchestrates claim extraction, evidence matching, classification, and score calculation."""

    def __init__(
        self,
        settings: Settings,
        evidence_retriever: EvidenceRetrievalService,
    ) -> None:
        self._settings = settings
        self._evidence_retriever = evidence_retriever

    async def verify_transformation(
        self,
        db: AsyncSession,
        transformation_id: uuid.UUID,
    ) -> VerificationReport:
        """
        Verify factuality and groundedness of a generated transformation.

        Args:
            db: Async database session.
            transformation_id: Target Transformation UUID.

        Returns:
            Persisted VerificationReport with claim-level breakdown.
        """
        # Check if report already exists for this transformation
        existing_res = await db.execute(
            select(VerificationReport).where(VerificationReport.transformation_id == transformation_id)
        )
        existing_report = existing_res.scalar_one_or_none()
        if existing_report is not None:
            return existing_report

        # Load Transformation
        tf_res = await db.execute(select(Transformation).where(Transformation.id == transformation_id))
        tf = tf_res.scalar_one_or_none()
        if tf is None:
            raise ValueError(f"Transformation '{transformation_id}' not found.")

        # Step 1: Extract atomic claims
        claims = ClaimExtractionService.extract_claims(
            content=tf.content,
            structured_output=tf.structured_output,
        )

        if not claims:
            # Fallback if no atomic sentences were split
            claims = [tf.content[:200]]

        verified_claims_list: List[VerifiedClaim] = []
        supported_cnt = 0
        partially_cnt = 0
        unsupported_cnt = 0

        # Step 2 & 3: Evidence Retrieval & Classification
        for claim_text in claims:
            match = await self._evidence_retriever.find_evidence_for_claim(
                document_id=tf.document_id,
                claim_text=claim_text,
            )

            # Classify claim based on similarity score threshold
            if match.similarity_score >= 0.65:
                classification = ClaimClassification.SUPPORTED
                reasoning = f"Supported by source document context (similarity score: {match.similarity_score:.2f})."
                supported_cnt += 1
            elif match.similarity_score >= 0.40:
                classification = ClaimClassification.PARTIALLY_SUPPORTED
                reasoning = f"Partially supported by source context (similarity score: {match.similarity_score:.2f})."
                partially_cnt += 1
            else:
                classification = ClaimClassification.UNSUPPORTED
                reasoning = "No sufficient evidence found in the original source document context."
                unsupported_cnt += 1

            verified_claims_list.append(
                VerifiedClaim(
                    id=uuid.uuid4(),
                    claim_text=claim_text,
                    classification=classification,
                    reasoning=reasoning,
                    evidence_snippet=match.evidence_snippet,
                    source_chunk_id=match.source_chunk_id,
                    page_number=match.page_number,
                    slide_number=match.slide_number,
                    confidence_score=match.similarity_score,
                )
            )

        # Step 4: Calculate Groundedness Score & Citation Coverage
        total_claims = len(claims)
        if total_claims > 0:
            groundedness_score = round(
                ((supported_cnt + 0.5 * partially_cnt) / total_claims) * 100.0, 1
            )
            citation_coverage = round(
                ((supported_cnt + partially_cnt) / total_claims) * 100.0, 1
            )
        else:
            groundedness_score = 0.0
            citation_coverage = 0.0

        # Step 5: Build and persist report
        report = VerificationReport(
            id=uuid.uuid4(),
            transformation_id=transformation_id,
            document_id=tf.document_id,
            groundedness_score=groundedness_score,
            citation_coverage=citation_coverage,
            total_claims=total_claims,
            supported_claims_count=supported_cnt,
            partially_supported_claims_count=partially_cnt,
            unsupported_claims_count=unsupported_cnt,
            claims=verified_claims_list,
        )

        db.add(report)
        await db.flush()

        logger.info(
            "Verification complete for transformation %s: score=%.1f%% (%d claims: %d supported, %d partial, %d unsupported)",
            transformation_id,
            groundedness_score,
            total_claims,
            supported_cnt,
            partially_cnt,
            unsupported_cnt,
        )
        return report

    async def get_verification_report(
        self,
        db: AsyncSession,
        transformation_id: uuid.UUID,
    ) -> Optional[VerificationReport]:
        """Fetch an existing verification report for a transformation."""
        res = await db.execute(
            select(VerificationReport).where(VerificationReport.transformation_id == transformation_id)
        )
        return res.scalar_one_or_none()


def get_verification_service(
    settings: Settings = get_settings(),
) -> VerificationService:
    """Factory helper for VerificationService."""
    retrieval_svc = get_retrieval_service(settings)
    evidence_retriever = EvidenceRetrievalService(retrieval_svc)
    return VerificationService(settings, evidence_retriever)
