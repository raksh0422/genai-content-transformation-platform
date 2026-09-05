"""Unit tests for semantic retrieval, embedding services, vector storage, and search API."""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.models.chunk import DocumentChunk
from app.services.embedding_service import LocalDeterministicEmbeddingService
from app.services.retrieval_service import RetrievalService
from app.services.vector_store_service import FAISSVectorStore, NumpyCosineVectorStore, VectorSearchResult


class TestEmbeddingServices:
    @pytest.mark.asyncio
    async def test_local_deterministic_embedding_service(self):
        svc = LocalDeterministicEmbeddingService(dimension=128)
        vecs = await svc.embed_texts(["hello world", "fastapi framework"])
        assert len(vecs) == 2
        assert len(vecs[0]) == 128
        assert len(vecs[1]) == 128

        query_vec = await svc.embed_query("hello world")
        assert len(query_vec) == 128
        assert vecs[0] == query_vec


class TestVectorStores:
    @pytest.mark.asyncio
    async def test_faiss_vector_store_add_and_search(self, test_settings):
        store = FAISSVectorStore(test_settings)
        doc_id = str(uuid.uuid4())
        vecs = [
            [1.0, 0.0, 0.0] + [0.0] * 1533,
            [0.0, 1.0, 0.0] + [0.0] * 1533,
        ]
        meta = [
            {"chunk_id": "c1", "chunk_index": 0, "text": "First chunk", "page_number": 1},
            {"chunk_id": "c2", "chunk_index": 1, "text": "Second chunk", "page_number": 2},
        ]
        await store.add_vectors(doc_id, vecs, meta)

        results = await store.search(doc_id, [1.0, 0.0, 0.0] + [0.0] * 1533, top_k=2)
        assert len(results) == 2
        assert results[0].chunk_id == "c1"
        assert results[0].score >= results[1].score
        await store.delete_index(doc_id)

    @pytest.mark.asyncio
    async def test_numpy_vector_store_fallback(self, test_settings):
        store = NumpyCosineVectorStore(test_settings)
        doc_id = str(uuid.uuid4())
        vecs = [
            [0.8, 0.2] + [0.0] * 1534,
            [0.1, 0.9] + [0.0] * 1534,
        ]
        meta = [
            {"chunk_id": "n1", "chunk_index": 0, "text": "Chunk A"},
            {"chunk_id": "n2", "chunk_index": 1, "text": "Chunk B"},
        ]
        await store.add_vectors(doc_id, vecs, meta)
        results = await store.search(doc_id, [0.8, 0.2] + [0.0] * 1534, top_k=1)
        assert len(results) == 1
        assert results[0].chunk_id == "n1"
        await store.delete_index(doc_id)


class TestRetrievalAPI:
    @pytest.mark.asyncio
    async def test_retrieval_search_endpoint(self, client: AsyncClient, sample_txt_bytes: bytes):
        # 1. Upload TXT document
        res_upload = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("retrieval_test.txt", sample_txt_bytes, "text/plain")},
        )
        assert res_upload.status_code == 202
        doc_id = res_upload.json()["id"]

        # 2. Wait/poll status completion
        res_doc = await client.get(f"/api/v1/documents/{doc_id}")
        assert res_doc.status_code == 200

        # 3. Perform semantic search
        res_search = await client.post(
            "/api/v1/retrieval/search",
            json={"document_id": doc_id, "query": "Introduction", "top_k": 3},
        )
        assert res_search.status_code == 200
        data = res_search.json()
        assert data["document_id"] == doc_id
        assert data["total_results"] > 0
        assert "score" in data["results"][0]
        assert "text" in data["results"][0]

    @pytest.mark.asyncio
    async def test_retrieval_search_nonexistent_document_returns_404(self, client: AsyncClient):
        fake_id = str(uuid.uuid4())
        res = await client.post(
            "/api/v1/retrieval/search",
            json={"document_id": fake_id, "query": "test query"},
        )
        assert res.status_code == 404
