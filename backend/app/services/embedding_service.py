"""Embedding Service behind a clean interface.

Supports OpenAI embedding models via the official OpenAI API, and a lightweight
deterministic local fallback when no API key is configured.
"""
from __future__ import annotations

import abc
import hashlib
import logging
import math
from typing import List

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class BaseEmbeddingService(abc.ABC):
    """Abstract interface for generating vector embeddings."""

    @abc.abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embedding vectors for a list of text strings."""
        pass

    @abc.abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding vector for a single query string."""
        pass


class OpenAIEmbeddingService(BaseEmbeddingService):
    """Generates vector embeddings via OpenAI API."""

    def __init__(self, api_key: str, model_name: str = "text-embedding-3-small", dimension: int = 1536) -> None:
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model_name
        self._dimension = dimension
        logger.info("OpenAIEmbeddingService initialized with model=%s", model_name)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        try:
            response = await self._client.embeddings.create(
                input=texts,
                model=self._model,
            )
            return [data.embedding for data in response.data]
        except Exception as exc:
            logger.error("OpenAI embedding generation failed: %s", exc)
            raise RuntimeError(f"OpenAI embedding error: {exc}") from exc

    async def embed_query(self, query: str) -> List[float]:
        embeddings = await self.embed_texts([query])
        return embeddings[0]


class LocalDeterministicEmbeddingService(BaseEmbeddingService):
    """
    Deterministic pseudo-embedding generator for local testing and dev mode
    when an OpenAI API key is not configured. Produces unit-norm 1536-dim vectors.
    """

    def __init__(self, dimension: int = 1536) -> None:
        self._dimension = dimension
        logger.info("LocalDeterministicEmbeddingService initialized (dim=%d)", dimension)

    def _hash_vector(self, text: str) -> List[float]:
        vector = [0.0] * self._dimension
        words = text.lower().split()
        if not words:
            return [1.0 / math.sqrt(self._dimension)] * self._dimension

        for word in words:
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self._dimension
            val = ((h >> 16) % 1000) / 1000.0 - 0.5
            vector[idx] += val

        # Normalize to unit length (L2 norm)
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]
        else:
            vector = [1.0 / math.sqrt(self._dimension)] * self._dimension

        return vector

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_vector(t) for t in texts]

    async def embed_query(self, query: str) -> List[float]:
        return self._hash_vector(query)


def get_embedding_service(settings: Settings | None = None) -> BaseEmbeddingService:
    """Factory function returning the configured embedding service."""
    if settings is None:
        settings = get_settings()

    if settings.openai_api_key and settings.openai_api_key.strip():
        return OpenAIEmbeddingService(
            api_key=settings.openai_api_key.strip(),
            model_name=settings.openai_embedding_model,
            dimension=settings.embedding_dimension,
        )

    logger.warning("No OPENAI_API_KEY set. Falling back to LocalDeterministicEmbeddingService.")
    return LocalDeterministicEmbeddingService(dimension=settings.embedding_dimension)
