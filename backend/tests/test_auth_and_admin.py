"""Comprehensive tests for Authentication, Role-Based Access Control, and Admin Analytics."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from scripts.create_admin import create_or_promote_admin


class TestAuthenticationAndRBAC:
    @pytest.mark.asyncio
    async def test_user_registration_succeeds_and_defaults_to_user_role(
        self, client: AsyncClient
    ):
        """1. A new user can register and receives the 'user' role."""
        payload = {
            "full_name": "Alice Wonderland",
            "email": "alice@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            # Attempt to sneak in admin role should be ignored
            "role": "admin",
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "alice@example.com"
        assert data["user"]["role"] == "user"  # Must be 'user'
        assert data["user"]["full_name"] == "Alice Wonderland"

    @pytest.mark.asyncio
    async def test_duplicate_email_registration_rejected(
        self, client: AsyncClient
    ):
        """2. Duplicate email registration is rejected."""
        payload = {
            "full_name": "Bob Builder",
            "email": "bob@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        res1 = await client.post("/api/v1/auth/register", json=payload)
        assert res1.status_code == 201

        # Second attempt with same email
        res2 = await client.post("/api/v1/auth/register", json=payload)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_password_mismatch_rejected(self, client: AsyncClient):
        payload = {
            "full_name": "Mismatch User",
            "email": "mismatch@example.com",
            "password": "Password123!",
            "confirm_password": "DifferentPassword123!",
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_regular_user_login_success_and_profile(
        self, client: AsyncClient
    ):
        """3. A regular user can log in and reach their profile."""
        reg_payload = {
            "full_name": "Charlie Chaplin",
            "email": "charlie@example.com",
            "password": "SecretPassword123!",
            "confirm_password": "SecretPassword123!",
        }
        await client.post("/api/v1/auth/register", json=reg_payload)

        # Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "charlie@example.com", "password": "SecretPassword123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        assert token

        # Get profile
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "charlie@example.com"
        assert me_res.json()["role"] == "user"

    @pytest.mark.asyncio
    async def test_invalid_login_credentials_rejected(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "WrongPassword!"},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_regular_user_forbidden_from_admin_apis(
        self, client: AsyncClient
    ):
        """5. A regular user cannot access admin pages or admin APIs."""
        reg_payload = {
            "full_name": "Regular Joe",
            "email": "joe@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        res = await client.post("/api/v1/auth/register", json=reg_payload)
        token = res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to access admin overview
        res_overview = await client.get("/api/v1/admin/analytics/overview", headers=headers)
        assert res_overview.status_code == 403

        # Attempt to access admin users list
        res_users = await client.get("/api/v1/admin/users", headers=headers)
        assert res_users.status_code == 403

        # Attempt to access admin documents
        res_docs = await client.get("/api/v1/admin/documents", headers=headers)
        assert res_docs.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_provisioning_and_full_admin_access(
        self, client: AsyncClient
    ):
        """4 & 8. Administrator provisioning, login, and dashboard analytics."""
        admin_email = "root.admin@contentai.internal"
        admin_pass = "SuperAdminPassword123!"

        # Provision admin via CLI script function
        await create_or_promote_admin(
            email=admin_email,
            password=admin_pass,
            full_name="Super Administrator",
        )

        # Login as Admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": admin_email, "password": admin_pass},
        )
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        assert login_res.json()["user"]["role"] == "admin"

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Overview KPIs
        kpi_res = await client.get("/api/v1/admin/analytics/overview?range=30d", headers=admin_headers)
        assert kpi_res.status_code == 200
        kpis = kpi_res.json()
        assert "total_users" in kpis
        assert "active_users" in kpis
        assert "total_documents" in kpis
        assert "total_transformations" in kpis
        assert "successful_transformations" in kpis
        assert "failed_transformations" in kpis
        assert kpis["total_users"] >= 1

        # 2. Charts
        charts_res = await client.get("/api/v1/admin/analytics/charts?range=30d", headers=admin_headers)
        assert charts_res.status_code == 200
        charts = charts_res.json()
        assert "user_growth" in charts
        assert "document_uploads" in charts
        assert "transformation_activity" in charts
        assert "generation_status" in charts
        assert "platform_usage" in charts

        # 3. Activity Logs
        act_res = await client.get("/api/v1/admin/analytics/activity", headers=admin_headers)
        assert act_res.status_code == 200
        assert "items" in act_res.json()

        # 4. Users list & search
        users_res = await client.get("/api/v1/admin/users?search=root", headers=admin_headers)
        assert users_res.status_code == 200
        assert len(users_res.json()["items"]) >= 1

        # 5. Documents list
        docs_res = await client.get("/api/v1/admin/documents", headers=admin_headers)
        assert docs_res.status_code == 200
        assert "items" in docs_res.json()

        # 6. Transformations list
        tfs_res = await client.get("/api/v1/admin/transformations", headers=admin_headers)
        assert tfs_res.status_code == 200
        assert "items" in tfs_res.json()

    @pytest.mark.asyncio
    async def test_admin_deactivate_and_reactivate_user(
        self, client: AsyncClient
    ):
        """12. Administrative actions are authorized and audited."""
        # Create regular user
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Target User",
                "email": "target@example.com",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        target_id = reg_res.json()["user"]["id"]

        # Admin headers
        await create_or_promote_admin(
            email="admin.mod@contentai.internal",
            password="ModAdminPassword123!",
            full_name="Mod Admin",
        )
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin.mod@contentai.internal", "password": "ModAdminPassword123!"},
        )
        admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Deactivate target user
        patch_res = await client.patch(
            f"/api/v1/admin/users/{target_id}/status",
            json={"is_active": False},
            headers=admin_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["is_active"] is False

        # Attempt to login as deactivated user -> should fail with 403
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "target@example.com", "password": "Password123!"},
        )
        assert bad_login.status_code == 403
        assert "deactivated" in bad_login.json()["detail"].lower()

        # Reactivate target user
        patch_res2 = await client.patch(
            f"/api/v1/admin/users/{target_id}/status",
            json={"is_active": True},
            headers=admin_headers,
        )
        assert patch_res2.status_code == 200
        assert patch_res2.json()["is_active"] is True

        # Target user can now login
        ok_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "target@example.com", "password": "Password123!"},
        )
        assert ok_login.status_code == 200

    @pytest.mark.asyncio
    async def test_logout_endpoint(self, client: AsyncClient):
        """7. Logging out invalidates the session appropriately."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Logout Tester",
                "email": "logout.test@example.com",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        token = reg.json()["access_token"]
        logout_res = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_res.status_code == 200
        assert "logged out" in logout_res.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_analytics_date_filters(self, client: AsyncClient):
        """9. Analytics date filters return correct results."""
        await create_or_promote_admin(
            email="filter.admin@contentai.internal",
            password="FilterAdminPass123!",
            full_name="Filter Admin",
        )
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "filter.admin@contentai.internal", "password": "FilterAdminPass123!"},
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        for rng in ["7d", "30d", "90d", "all"]:
            kpi_res = await client.get(f"/api/v1/admin/analytics/overview?range={rng}", headers=headers)
            assert kpi_res.status_code == 200
            charts_res = await client.get(f"/api/v1/admin/analytics/charts?range={rng}", headers=headers)
            assert charts_res.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_delete_document_cascade(
        self, client: AsyncClient, sample_txt_bytes: bytes
    ):
        """11 & 13. Admin can safely delete a document and cascade is executed."""
        import io

        # 1. Upload a document
        upload_res = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("to_delete.txt", io.BytesIO(sample_txt_bytes), "text/plain")},
        )
        assert upload_res.status_code == 202
        doc_id = upload_res.json()["id"]

        # 2. Admin logs in
        await create_or_promote_admin(
            email="purge.admin@contentai.internal",
            password="PurgeAdminPass123!",
            full_name="Purge Admin",
        )
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "purge.admin@contentai.internal", "password": "PurgeAdminPass123!"},
        )
        headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # 3. Admin deletes the document
        del_res = await client.delete(f"/api/v1/admin/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 204

        # 4. Verifying document is gone
        get_res = await client.get(f"/api/v1/documents/{doc_id}")
        assert get_res.status_code == 404

