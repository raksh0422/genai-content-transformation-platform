"""Vector Store Abstraction.

Uses FAISS for local vector index storage and fast cosine/L2 search,
persisting per-document vector indices and chunk metadata maps to disk.
"""
from __future__ import annotations

import abc
import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

try:
    import faiss
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class VectorSearchResult:
    """Result item from a vector similarity search."""
    chunk_id: str
    chunk_index: int
    page_number: Optional[int]
    slide_number: Optional[int]
    score: float  # Cosine similarity score in range [0, 1]
    text: str
    chunk_type: str = "paragraph"


class BaseVectorStore(abc.ABC):
    """Abstract vector store interface."""

    @abc.abstractmethod
    async def add_vectors(
        self,
        document_id: str,
        vectors: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        """Store vectors and metadata for a document."""
        pass

    @abc.abstractmethod
    async def search(
        self,
        document_id: str,
        query_vector: List[float],
        top_k: int = 5,
    ) -> List[VectorSearchResult]:
        """Perform similarity search for a query vector against a document's index."""
        pass

    @abc.abstractmethod
    async def delete_index(self, document_id: str) -> None:
        """Delete vector index files for a document."""
        pass


class FAISSVectorStore(BaseVectorStore):
    """FAISS-backed vector store with disk persistence per document."""

    def __init__(self, settings: Settings) -> None:
        self._index_dir = settings.vector_index_dir
        self._dimension = settings.embedding_dimension
        self._index_dir.mkdir(parents=True, exist_ok=True)
        logger.info("FAISSVectorStore initialized at %s", self._index_dir)

    def _get_faiss_path(self, document_id: str) -> Path:
        return self._index_dir / f"{document_id}.faiss"

    def _get_meta_path(self, document_id: str) -> Path:
        return self._index_dir / f"{document_id}.json"

    async def add_vectors(
        self,
        document_id: str,
        vectors: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        if not vectors:
            return

        arr = np.array(vectors, dtype=np.float32)
        # Normalize vectors for Cosine Similarity (IndexFlatIP with normalized vectors)
        faiss.normalize_L2(arr)

        dim = arr.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(arr)

        # Save FAISS binary index
        faiss.write_index(index, str(self._get_faiss_path(document_id)))

        # Save metadata mapping (JSON)
        with open(self._get_meta_path(document_id), "w", encoding="utf-8") as f:
            json.dump(metadatas, f, ensure_ascii=False, indent=2)

        logger.info(
            "FAISS index created for doc=%s with %d vectors (dim=%d)",
            document_id,
            len(vectors),
            dim,
        )

    async def search(
        self,
        document_id: str,
        query_vector: List[float],
        top_k: int = 5,
    ) -> List[VectorSearchResult]:
        faiss_path = self._get_faiss_path(document_id)
        meta_path = self._get_meta_path(document_id)

        if not faiss_path.exists() or not meta_path.exists():
            logger.warning("No vector index found for doc=%s", document_id)
            return []

        # Load metadata
        with open(meta_path, "r", encoding="utf-8") as f:
            metadatas = json.load(f)

        # Load FAISS index
        index = faiss.read_index(str(faiss_path))

        # Query vector setup
        q_arr = np.array([query_vector], dtype=np.float32)
        faiss.normalize_L2(q_arr)

        actual_k = min(top_k, index.ntotal)
        if actual_k <= 0:
            return []

        scores, indices = index.search(q_arr, actual_k)

        results: List[VectorSearchResult] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(metadatas):
                continue
            meta = metadatas[idx]
            # Convert Inner Product score to similarity score [0, 1]
            sim_score = max(0.0, min(1.0, float((score + 1.0) / 2.0)))
            results.append(
                VectorSearchResult(
                    chunk_id=meta.get("chunk_id", ""),
                    chunk_index=meta.get("chunk_index", 0),
                    page_number=meta.get("page_number"),
                    slide_number=meta.get("slide_number"),
                    score=sim_score,
                    text=meta.get("text", ""),
                    chunk_type=meta.get("chunk_type", "paragraph"),
                )
            )

        return results

    async def delete_index(self, document_id: str) -> None:
        faiss_path = self._get_faiss_path(document_id)
        meta_path = self._get_meta_path(document_id)
        faiss_path.unlink(missing_ok=True)
        meta_path.unlink(missing_ok=True)


class NumpyCosineVectorStore(BaseVectorStore):
    """Fallback pure Numpy vector store if FAISS is not installed."""

    def __init__(self, settings: Settings) -> None:
        self._index_dir = settings.vector_index_dir
        self._index_dir.mkdir(parents=True, exist_ok=True)

    def _get_npy_path(self, document_id: str) -> Path:
        return self._index_dir / f"{document_id}.npy"

    def _get_meta_path(self, document_id: str) -> Path:
        return self._index_dir / f"{document_id}.json"

    async def add_vectors(
        self,
        document_id: str,
        vectors: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        if not vectors:
            return
        arr = np.array(vectors, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = arr / norms
        np.save(self._get_npy_path(document_id), normalized)
        with open(self._get_meta_path(document_id), "w", encoding="utf-8") as f:
            json.dump(metadatas, f, ensure_ascii=False, indent=2)

    async def search(
        self,
        document_id: str,
        query_vector: List[float],
        top_k: int = 5,
    ) -> List[VectorSearchResult]:
        npy_path = self._get_npy_path(document_id)
        meta_path = self._get_meta_path(document_id)
        if not npy_path.exists() or not meta_path.exists():
            return []

        with open(meta_path, "r", encoding="utf-8") as f:
            metadatas = json.load(f)
        matrix = np.load(npy_path)

        q_arr = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)
        if q_norm > 0:
            q_arr = q_arr / q_norm

        scores = np.dot(matrix, q_arr)
        top_indices = np.argsort(scores)[::-1][:top_k]

        results: List[VectorSearchResult] = []
        for idx in top_indices:
            meta = metadatas[idx]
            sim_score = max(0.0, min(1.0, float((scores[idx] + 1.0) / 2.0)))
            results.append(
                VectorSearchResult(
                    chunk_id=meta.get("chunk_id", ""),
                    chunk_index=meta.get("chunk_index", 0),
                    page_number=meta.get("page_number"),
                    slide_number=meta.get("slide_number"),
                    score=sim_score,
                    text=meta.get("text", ""),
                    chunk_type=meta.get("chunk_type", "paragraph"),
                )
            )
        return results

    async def delete_index(self, document_id: str) -> None:
        self._get_npy_path(document_id).unlink(missing_ok=True)
        self._get_meta_path(document_id).unlink(missing_ok=True)


def get_vector_store(settings: Settings | None = None) -> BaseVectorStore:
    """Return configured vector store implementation."""
    if settings is None:
        settings = get_settings()

    if _FAISS_AVAILABLE:
        return FAISSVectorStore(settings)
    return NumpyCosineVectorStore(settings)
