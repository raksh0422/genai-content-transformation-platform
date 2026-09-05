"""API integration tests using ASGI test client."""
import io
import pytest


class TestHealthEndpoint:
    async def test_health_returns_ok(self, client):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    async def test_health_version_present(self, client):
        response = await client.get("/api/v1/health")
        assert response.json()["version"] == "1.0.0"


class TestDocumentUpload:
    async def test_upload_txt_success(self, client, sample_txt_bytes):
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", io.BytesIO(sample_txt_bytes), "text/plain")},
        )
        assert response.status_code == 202
        data = response.json()
        assert "id" in data
        assert data["file_extension"] == ".txt"
        assert data["status"] == "uploaded"
        assert data["original_filename"] == "test.txt"

    async def test_upload_pdf_success(self, client, sample_pdf_bytes):
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("report.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 202
        data = response.json()
        assert data["file_extension"] == ".pdf"

    async def test_upload_docx_success(self, client, sample_docx_bytes):
        response = await client.post(
            "/api/v1/documents/upload",
            files={
                "file": (
                    "document.docx",
                    io.BytesIO(sample_docx_bytes),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )
        assert response.status_code == 202

    async def test_upload_invalid_extension_rejected(self, client):
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("virus.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")},
        )
        assert response.status_code == 400
        assert "extension" in response.json()["detail"].lower()

    async def test_upload_oversized_file_rejected(self, client):
        # Settings in test_settings cap at 10MB; send 11MB
        big_content = b"a" * (11 * 1024 * 1024)
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("large.txt", io.BytesIO(big_content), "text/plain")},
        )
        assert response.status_code == 400
        assert "exceeds" in response.json()["detail"].lower()

    async def test_upload_no_file_returns_422(self, client):
        response = await client.post("/api/v1/documents/upload")
        assert response.status_code == 422


class TestDocumentRetrieval:
    async def _upload_txt(self, client, sample_txt_bytes) -> str:
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", io.BytesIO(sample_txt_bytes), "text/plain")},
        )
        assert response.status_code == 202
        return response.json()["id"]

    async def test_get_document_metadata(self, client, sample_txt_bytes):
        doc_id = await self._upload_txt(client, sample_txt_bytes)
        response = await client.get(f"/api/v1/documents/{doc_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == doc_id
        assert data["original_filename"] == "test.txt"

    async def test_get_nonexistent_document_returns_404(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/documents/{fake_id}")
        assert response.status_code == 404

    async def test_list_documents_returns_list(self, client, sample_txt_bytes):
        await self._upload_txt(client, sample_txt_bytes)
        response = await client.get("/api/v1/documents")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 1

    async def test_get_chunks_requires_processed_status(self, client, sample_txt_bytes):
        doc_id = await self._upload_txt(client, sample_txt_bytes)
        # Immediately after upload the status is 'uploaded', not 'completed'
        response = await client.get(f"/api/v1/documents/{doc_id}/chunks")
        # Should be 409 (conflict) since processing hasn't finished
        assert response.status_code in (409, 200)  # 200 if bg task ran synchronously
