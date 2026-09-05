"""Phase 3: create verification_reports and verified_claims tables.

Revision ID: 0003_verification
Revises: 0002_transformations
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_verification"
down_revision: Union[str, None] = "0002_transformations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type
    claim_enum = postgresql.ENUM(
        "SUPPORTED",
        "PARTIALLY_SUPPORTED",
        "UNSUPPORTED",
        name="claim_classification_enum",
    )
    claim_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "verification_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transformation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("groundedness_score", sa.Float(), nullable=False),
        sa.Column("citation_coverage", sa.Float(), nullable=False),
        sa.Column("total_claims", sa.Integer(), nullable=False),
        sa.Column("supported_claims_count", sa.Integer(), nullable=False),
        sa.Column("partially_supported_claims_count", sa.Integer(), nullable=False),
        sa.Column("unsupported_claims_count", sa.Integer(), nullable=False),
        sa.Column("disclaimer", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transformation_id"], ["transformations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transformation_id"),
    )
    op.create_index("ix_verification_reports_document_id", "verification_reports", ["document_id"])
    op.create_index("ix_verification_reports_transformation_id", "verification_reports", ["transformation_id"])

    op.create_table(
        "verified_claims",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("claim_text", sa.Text(), nullable=False),
        sa.Column(
            "classification",
            sa.Enum("SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", name="claim_classification_enum"),
            nullable=False,
        ),
        sa.Column("reasoning", sa.Text(), nullable=False),
        sa.Column("evidence_snippet", sa.Text(), nullable=True),
        sa.Column("source_chunk_id", sa.String(256), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("slide_number", sa.Integer(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["verification_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_verified_claims_report_id", "verified_claims", ["report_id"])


def downgrade() -> None:
    op.drop_index("ix_verified_claims_report_id", table_name="verified_claims")
    op.drop_table("verified_claims")
    op.drop_index("ix_verification_reports_transformation_id", table_name="verification_reports")
    op.drop_index("ix_verification_reports_document_id", table_name="verification_reports")
    op.drop_table("verification_reports")
    claim_enum = postgresql.ENUM(
        "SUPPORTED",
        "PARTIALLY_SUPPORTED",
        "UNSUPPORTED",
        name="claim_classification_enum",
    )
    claim_enum.drop(op.get_bind(), checkfirst=True)
