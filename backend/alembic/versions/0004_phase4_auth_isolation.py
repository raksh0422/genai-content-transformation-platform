"""Phase 4: add user_id column to documents and transformations tables.

Revision ID: 0004_auth_isolation
Revises: 0003_verification
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_auth_isolation"
down_revision: Union[str, None] = "0003_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("user_id", sa.String(256), nullable=False, server_default="usr_demo_default"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])

    op.add_column(
        "transformations",
        sa.Column("user_id", sa.String(256), nullable=False, server_default="usr_demo_default"),
    )
    op.create_index("ix_transformations_user_id", "transformations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_transformations_user_id", table_name="transformations")
    op.drop_column("transformations", "user_id")

    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_column("documents", "user_id")
