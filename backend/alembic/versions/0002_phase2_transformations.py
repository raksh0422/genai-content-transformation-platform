"""Phase 2: create transformations table.

Revision ID: 0002_transformations
Revises: 0001_initial
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_transformations"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transformations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transformation_type", sa.String(64), nullable=False),
        sa.Column("tone", sa.String(32), nullable=False),
        sa.Column("length", sa.String(32), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("structured_output", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("source_chunks", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transformations_document_id", "transformations", ["document_id"])
    op.create_index("ix_transformations_type", "transformations", ["transformation_type"])


def downgrade() -> None:
    op.drop_index("ix_transformations_type", table_name="transformations")
    op.drop_index("ix_transformations_document_id", table_name="transformations")
    op.drop_table("transformations")
