"""Unit tests for prompt templates, structured output schemas, RAG generator service, and transformation API endpoints."""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.services.transformations.prompts import PROMPTS, get_transformation_config
from app.services.transformations.schemas import FAQResponse, QuizResponse, EmailResponse, ExecutiveSummaryResponse


class TestTransformationConfigs:
    def test_all_7_transformation_types_registered(self):
        expected = {
            "short_summary",
            "executive_summary",
            "faq",
            "quiz",
            "email",
            "social_post",
            "presentation_outline",
        }
        assert set(PROMPTS.keys()) == expected

    def test_get_transformation_config_valid(self):
        cfg = get_transformation_config("faq")
        assert cfg.type_name == "faq"
        assert cfg.schema_class == FAQResponse

    def test_get_transformation_config_invalid_raises(self):
        with pytest.raises(ValueError):
            get_transformation_config("invalid_type")


class TestTransformationAPI:
    @pytest.mark.asyncio
    async def test_generate_and_retrieve_transformations(
        self, client: AsyncClient, sample_txt_bytes: bytes
    ):
        # 1. Upload TXT document
        res_upload = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("transformation_test.txt", sample_txt_bytes, "text/plain")},
        )
        assert res_upload.status_code == 202
        doc_id = res_upload.json()["id"]

        # 2. Test generating short_summary
        res_gen_summary = await client.post(
            "/api/v1/transformations/generate",
            json={
                "document_id": doc_id,
                "transformation_type": "short_summary",
                "tone": "executive",
                "length": "short",
            },
        )
        assert res_gen_summary.status_code == 201
        tf_data = res_gen_summary.json()
        assert tf_data["document_id"] == doc_id
        assert tf_data["transformation_type"] == "short_summary"
        assert "content" in tf_data
        assert "source_chunks" in tf_data
        tf_id = tf_data["id"]

        # 3. Test generating structured FAQ
        res_gen_faq = await client.post(
            "/api/v1/transformations/generate",
            json={
                "document_id": doc_id,
                "transformation_type": "faq",
                "tone": "professional",
                "length": "medium",
            },
        )
        assert res_gen_faq.status_code == 201
        faq_data = res_gen_faq.json()
        assert faq_data["structured_output"] is not None
        assert "items" in faq_data["structured_output"]

        # 4. Get single transformation by ID
        res_get = await client.get(f"/api/v1/transformations/{tf_id}")
        assert res_get.status_code == 200
        assert res_get.json()["id"] == tf_id

        # 5. List document transformations
        res_list = await client.get(f"/api/v1/documents/{doc_id}/transformations")
        assert res_list.status_code == 200
        list_data = res_list.json()
        assert list_data["document_id"] == doc_id
        assert list_data["total"] >= 2

    @pytest.mark.asyncio
    async def test_generate_invalid_type_returns_400(
        self, client: AsyncClient, sample_txt_bytes: bytes
    ):
        res_upload = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("invalid_type_test.txt", sample_txt_bytes, "text/plain")},
        )
        assert res_upload.status_code == 202
        doc_id = res_upload.json()["id"]

        res = await client.post(
            "/api/v1/transformations/generate",
            json={
                "document_id": doc_id,
                "transformation_type": "nonexistent_type",
            },
        )
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_pdf_rag_transformation_with_citations(
        self, client: AsyncClient, sample_pdf_bytes: bytes
    ):
        """Verify end-to-end PDF upload -> indexing -> RAG generation -> citation metadata."""
        # 1. Upload sample PDF
        res_upload = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample_report.pdf", sample_pdf_bytes, "application/pdf")},
        )
        assert res_upload.status_code == 202
        doc_id = res_upload.json()["id"]

        # 2. Generate presentation_outline
        res_gen = await client.post(
            "/api/v1/transformations/generate",
            json={
                "document_id": doc_id,
                "transformation_type": "presentation_outline",
                "tone": "executive",
                "length": "medium",
            },
        )
        assert res_gen.status_code == 201
        data = res_gen.json()
        assert data["document_id"] == doc_id
        assert data["transformation_type"] == "presentation_outline"

        # Verify source citations preserved
        citations = data["source_chunks"]
        assert citations is not None
        assert len(citations) > 0
        assert "chunk_id" in citations[0]
        assert "similarity_score" in citations[0]
        assert "snippet" in citations[0]


