"""Evidence Retrieval Service.

Searches original document vector stores and source citations to find evidence
snippets supporting or refuting each extracted claim.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.services.retrieval_service import RetrievalService
from app.services.vector_store_service import VectorSearchResult

logger = logging.getLogger(__name__)


@dataclass
class ClaimEvidenceMatch:
    claim_text: str
    evidence_snippet: Optional[str]
    source_chunk_id: Optional[str]
    page_number: Optional[int]
    slide_number: Optional[int]
    similarity_score: float


class EvidenceRetrievalService:
    """Searches original document chunks for evidence supporting an extracted claim."""

    def __init__(self, retrieval_service: RetrievalService) -> None:
        self._retrieval_service = retrieval_service

    async def find_evidence_for_claim(
        self,
        document_id: uuid.UUID,
        claim_text: str,
    ) -> ClaimEvidenceMatch:
        """
        Execute vector similarity search against original document for a claim statement.

        Returns:
            ClaimEvidenceMatch object containing top evidence snippet and location.
        """
        results: List[VectorSearchResult] = await self._retrieval_service.search_document(
            document_id=document_id,
            query=claim_text,
            top_k=1,
        )

        if not results:
            return ClaimEvidenceMatch(
                claim_text=claim_text,
                evidence_snippet=None,
                source_chunk_id=None,
                page_number=None,
                slide_number=None,
                similarity_score=0.0,
            )

        top_match = results[0]
        return ClaimEvidenceMatch(
            claim_text=claim_text,
            evidence_snippet=top_match.text,
            source_chunk_id=top_match.chunk_id,
            page_number=top_match.page_number,
            slide_number=top_match.slide_number,
            similarity_score=round(top_match.score, 4),
        )
