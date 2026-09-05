"""Unit tests for Authentication, Authorization, and Multi-Tenant User Isolation."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestAuthAndTenantIsolation:
    @pytest.mark.asyncio
    async def test_unauthenticated_request_defaults_to_demo_user(
        self, client: AsyncClient, sample_txt_bytes: bytes
    ):
        res = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("user1_doc.txt", sample_txt_bytes, "text/plain")},
        )
        assert res.status_code == 202

    @pytest.mark.asyncio
    async def test_tenant_isolation_between_different_users(
        self, client: AsyncClient, sample_txt_bytes: bytes
    ):
        # 1. User A uploads a document
        res_a = await client.post(
            "/api/v1/documents/upload",
            headers={"X-User-ID": "usr_tenant_alice"},
            files={"file": ("alice_doc.txt", sample_txt_bytes, "text/plain")},
        )
        assert res_a.status_code == 202
        alice_doc_id = res_a.json()["id"]

        # 2. User B uploads a document
        res_b = await client.post(
            "/api/v1/documents/upload",
            headers={"X-User-ID": "usr_tenant_bob"},
            files={"file": ("bob_doc.txt", sample_txt_bytes, "text/plain")},
        )
        assert res_b.status_code == 202
        bob_doc_id = res_b.json()["id"]

        # 3. User A lists documents -> sees Alice's doc, but NOT Bob's doc
        res_a_list = await client.get(
            "/api/v1/documents",
            headers={"X-User-ID": "usr_tenant_alice"},
        )
        assert res_a_list.status_code == 200
        alice_docs = [d["id"] for d in res_a_list.json()["items"]]
        assert alice_doc_id in alice_docs
        assert bob_doc_id not in alice_docs

        # 4. User B tries to access Alice's doc -> returns 404 (Forbidden/Isolated)
        res_b_access_alice = await client.get(
            f"/api/v1/documents/{alice_doc_id}",
            headers={"X-User-ID": "usr_tenant_bob"},
        )
        assert res_b_access_alice.status_code == 404
