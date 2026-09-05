"""RAG Transformation Generator Service.

Retrieves relevant document chunks, constructs grounded context, invokes the LLM provider,
validates structured JSON outputs, and persists transformation records in PostgreSQL.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models.document import Document
from app.models.transformation import Transformation
from app.services.llm_service import BaseLLMProvider, get_llm_provider
from app.services.retrieval_service import RetrievalService, get_retrieval_service
from app.services.transformations.prompts import get_transformation_config

logger = logging.getLogger(__name__)


class TransformationService:
    """Orchestrates retrieval-augmented content generation and persistence."""

    def __init__(
        self,
        settings: Settings,
        retrieval_service: RetrievalService,
        llm_provider: BaseLLMProvider,
    ) -> None:
        self._settings = settings
        self._retrieval_service = retrieval_service
        self._llm_provider = llm_provider

    async def generate_transformation(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        transformation_type: str,
        tone: str = "professional",
        length: str = "medium",
        query_hint: Optional[str] = None,
    ) -> Transformation:
        """
        Generate a source-grounded transformation for a document.

        Args:
            db: Async database session.
            document_id: Target Document UUID.
            transformation_type: One of 7 supported types.
            tone: e.g. 'professional', 'executive', 'casual', 'academic'.
            length: e.g. 'short', 'medium', 'detailed'.
            query_hint: Optional targeted query for retrieval filtering.

        Returns:
            Persisted Transformation ORM instance.
        """
        # Load document
        res = await db.execute(select(Document).where(Document.id == document_id))
        doc = res.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {document_id} not found.")

        if doc.status != "completed":
            raise ValueError(f"Document status is '{doc.status}'. Generation requires 'completed' status.")

        config = get_transformation_config(transformation_type)

        # Retrieve top relevant chunks
        search_query = query_hint or f"Key findings, main points, summary, and conclusions for {doc.original_filename}"
        retrieved_chunks = await self._retrieval_service.search_document(
            document_id=document_id,
            query=search_query,
            top_k=self._settings.default_top_k,
        )

        if not retrieved_chunks:
            # Fallback: load all chunks if search vector index returned empty
            from app.services.document_service import DocumentService
            from app.services.storage_service import StorageService
            storage = StorageService(self._settings)
            doc_svc = DocumentService(self._settings, storage)
            db_chunks = await doc_svc.get_document_chunks(db, document_id)
            from app.services.vector_store_service import VectorSearchResult
            retrieved_chunks = [
                VectorSearchResult(
                    chunk_id=str(c.id),
                    chunk_index=c.chunk_index,
                    page_number=c.page_number,
                    slide_number=c.slide_number,
                    score=1.0,
                    text=c.text,
                    chunk_type=c.chunk_type,
                )
                for c in db_chunks[:self._settings.default_top_k]
            ]

        # Format context block with explicit source citations
        context_blocks: List[str] = []
        source_citations: List[Dict[str, Any]] = []

        for item in retrieved_chunks:
            location = ""
            if item.page_number is not None:
                location = f" | Page {item.page_number}"
            elif item.slide_number is not None:
                location = f" | Slide {item.slide_number}"

            header = f"[Chunk #{item.chunk_index}{location}]"
            context_blocks.append(f"{header}\n{item.text}")

            source_citations.append({
                "chunk_id": item.chunk_id,
                "chunk_index": item.chunk_index,
                "page_number": item.page_number,
                "slide_number": item.slide_number,
                "similarity_score": round(item.score, 4),
                "snippet": item.text[:200] + ("…" if len(item.text) > 200 else ""),
            })

        formatted_context = "\n\n---\n\n".join(context_blocks)

        # Build prompt
        prompt = config.user_prompt_template.format(
            tone=tone,
            length=length,
            context=formatted_context,
        )

        logger.info(
            "Generating transformation '%s' for doc %s (chunks=%d)",
            transformation_type,
            document_id,
            len(retrieved_chunks),
        )

        # Execute LLM completion
        llm_res = await self._llm_provider.generate(
            prompt=prompt,
            system_prompt=config.system_prompt,
            response_schema=config.schema_class,
        )

        title = f"{config.display_title} — {doc.original_filename}"

        # Persist Transformation in database
        tf = Transformation(
            id=uuid.uuid4(),
            document_id=document_id,
            transformation_type=transformation_type,
            tone=tone,
            length=length,
            title=title,
            content=llm_res.content,
            structured_output=llm_res.structured_data,
            source_chunks=source_citations,
        )
        db.add(tf)
        await db.flush()

        logger.info("Transformation %s persisted for doc %s", tf.id, document_id)
        return tf

    async def get_transformation(
        self,
        db: AsyncSession,
        transformation_id: uuid.UUID,
    ) -> Optional[Transformation]:
        """Fetch a single transformation by ID."""
        res = await db.execute(select(Transformation).where(Transformation.id == transformation_id))
        return res.scalar_one_or_none()

    async def list_document_transformations(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
    ) -> List[Transformation]:
        """Fetch all transformations generated for a document."""
        res = await db.execute(
            select(Transformation)
            .where(Transformation.document_id == document_id)
            .order_by(Transformation.created_at.desc())
        )
        return list(res.scalars().all())


def get_transformation_service(
    settings: Settings = get_settings(),
) -> TransformationService:
    """Factory for TransformationService."""
    retrieval_svc = get_retrieval_service(settings)
    llm_provider = get_llm_provider(settings)
    return TransformationService(settings, retrieval_svc, llm_provider)
