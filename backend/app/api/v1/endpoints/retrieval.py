"""Semantic retrieval API route handlers."""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas.retrieval import RetrievalSearchRequest, RetrievalSearchResponse, RetrievalSearchResultItem
from app.services.document_service import DocumentService
from app.services.retrieval_service import get_retrieval_service
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


@router.post(
    "/search",
    response_model=RetrievalSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Similarity Search",
    description="Perform vector similarity search for a query against document chunks, returning top-k matches with similarity scores and metadata.",
)
async def search_document_chunks(
    body: RetrievalSearchRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RetrievalSearchResponse:
    """Execute semantic similarity search for a query against a document's vector index."""
    # Verify document exists
    storage_svc = StorageService(settings)
    doc_svc = DocumentService(settings, storage_svc)
    doc = await doc_svc.get_document(db, body.document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{body.document_id}' not found.",
        )

    if doc.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document status is '{doc.status}'. Search requires 'completed' status.",
        )

    retrieval_svc = get_retrieval_service(settings)
    results = await retrieval_svc.search_document(
        document_id=body.document_id,
        query=body.query,
        top_k=body.top_k,
    )

    items = [
        RetrievalSearchResultItem(
            chunk_id=res.chunk_id,
            chunk_index=res.chunk_index,
            page_number=res.page_number,
            slide_number=res.slide_number,
            score=res.score,
            text=res.text,
            chunk_type=res.chunk_type,
        )
        for res in results
    ]

    return RetrievalSearchResponse(
        document_id=body.document_id,
        query=body.query,
        total_results=len(items),
        results=items,
    )
