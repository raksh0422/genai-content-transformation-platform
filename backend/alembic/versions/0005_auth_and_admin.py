"""Phase 5: Add users, activity_logs, and transformation status/duration columns.

Revision ID: 0005_auth_and_admin
Revises: 0004_auth_isolation
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005_auth_and_admin"
down_revision: Union[str, None] = "0004_auth_isolation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(256), nullable=False),
        sa.Column("hashed_password", sa.String(512), nullable=False),
        sa.Column("full_name", sa.String(256), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_active", "users", ["is_active"])
    op.create_index("ix_users_created_at", "users", ["created_at"])

    # 2. Create activity_logs table
    op.create_table(
        "activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(256), nullable=True),
        sa.Column("user_email", sa.String(256), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=True),
        sa.Column("resource_id", sa.String(256), nullable=True),
        sa.Column("description", sa.String(512), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="success"),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_event_type", "activity_logs", ["event_type"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])

    # 3. Add status, duration, error fields to transformations
    op.add_column(
        "transformations",
        sa.Column("status", sa.String(32), nullable=False, server_default="completed"),
    )
    op.create_index("ix_transformations_status", "transformations", ["status"])

    op.add_column(
        "transformations",
        sa.Column("duration_seconds", sa.Float(), nullable=True),
    )
    op.add_column(
        "transformations",
        sa.Column("error_category", sa.String(128), nullable=True),
    )
    op.add_column(
        "transformations",
        sa.Column("error_message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transformations", "error_message")
    op.drop_column("transformations", "error_category")
    op.drop_column("transformations", "duration_seconds")
    op.drop_index("ix_transformations_status", table_name="transformations")
    op.drop_column("transformations", "status")

    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_event_type", table_name="activity_logs")
    op.drop_index("ix_activity_logs_user_id", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_index("ix_users_created_at", table_name="users")
    op.drop_index("ix_users_is_active", table_name="users")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
