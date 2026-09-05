"""Semantic Retrieval Service.

Handles embedding generation, vector indexing of document chunks, and
semantic similarity search against document vector stores.
"""
from __future__ import annotations

import logging
import uuid
from typing import List, Optional

from app.config import Settings, get_settings
from app.models.chunk import DocumentChunk
from app.services.embedding_service import BaseEmbeddingService, get_embedding_service
from app.services.vector_store_service import (
    BaseVectorStore,
    VectorSearchResult,
    get_vector_store,
)

logger = logging.getLogger(__name__)


class RetrievalService:
    """Orchestrates embedding generation, vector indexing, and semantic search."""

    def __init__(
        self,
        settings: Settings,
        embedding_service: BaseEmbeddingService,
        vector_store: BaseVectorStore,
    ) -> None:
        self._settings = settings
        self._embedding_service = embedding_service
        self._vector_store = vector_store

    async def index_document_chunks(
        self,
        document_id: uuid.UUID,
        chunks: List[DocumentChunk],
    ) -> None:
        """
        Embed all chunks for a document and persist the vector index + metadata map.

        Args:
            document_id: Document UUID.
            chunks: List of DocumentChunk ORM instances.
        """
        if not chunks:
            logger.warning("index_document_chunks: No chunks provided for doc %s", document_id)
            return

        texts = [chunk.text for chunk in chunks]
        logger.info("Generating embeddings for %d chunks of doc %s", len(chunks), document_id)
        vectors = await self._embedding_service.embed_texts(texts)

        metadatas = [
            {
                "chunk_id": str(chunk.id),
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "slide_number": chunk.slide_number,
                "chunk_type": chunk.chunk_type,
                "text": chunk.text,
            }
            for chunk in chunks
        ]

        await self._vector_store.add_vectors(
            document_id=str(document_id),
            vectors=vectors,
            metadatas=metadatas,
        )
        logger.info("Successfully indexed %d chunks for doc %s", len(chunks), document_id)

    async def search_document(
        self,
        document_id: uuid.UUID,
        query: str,
        top_k: Optional[int] = None,
    ) -> List[VectorSearchResult]:
        """
        Perform semantic similarity search for a query string against a document.

        Args:
            document_id: Document UUID.
            query: User search query.
            top_k: Number of top results to return.

        Returns:
            List of VectorSearchResult objects sorted by similarity score.
        """
        if not query or not query.strip():
            return []

        k = top_k or self._settings.default_top_k
        logger.debug("Executing semantic search for doc %s, query='%s', top_k=%d", document_id, query, k)

        query_vector = await self._embedding_service.embed_query(query.strip())
        results = await self._vector_store.search(
            document_id=str(document_id),
            query_vector=query_vector,
            top_k=k,
        )
        logger.info("Semantic search returned %d results for doc %s", len(results), document_id)
        return results


def get_retrieval_service(
    settings: Settings = get_settings(),
) -> RetrievalService:
    """Factory helper for RetrievalService."""
    embedding_svc = get_embedding_service(settings)
    vector_store = get_vector_store(settings)
    return RetrievalService(settings, embedding_svc, vector_store)
