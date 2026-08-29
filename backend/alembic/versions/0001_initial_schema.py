"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-01-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Explicitly create the enum type up front, then reference it with create_type=False
    # in the column definition below. Without create_type=False, op.create_table() would
    # ALSO try to emit its own CREATE TYPE for this column (Postgres enum columns trigger
    # type creation as part of table DDL by default), causing a duplicate "type already
    # exists" error on a fresh database. checkfirst=True additionally makes the explicit
    # create a no-op if the type is somehow already present (e.g. a partially-applied
    # migration retried after a prior failure).
    dataset_status = postgresql.ENUM(
        "uploaded", "validating", "valid", "invalid", "analyzing", "analyzed", "failed",
        name="dataset_status",
        create_type=False,
    )
    dataset_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("owner_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("status", dataset_status, nullable=False, server_default="uploaded"),
        sa.Column("validation_error", sa.String(1024), nullable=True),
        sa.Column("row_count", sa.Integer, nullable=True),
        sa.Column("column_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_datasets_owner_id", "datasets", ["owner_id"])
    op.create_index("ix_datasets_status", "datasets", ["status"])

    op.create_table(
        "dataset_columns",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("dataset_id", sa.Integer, sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("detected_type", sa.String(50), nullable=False),
        sa.Column("missing_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("missing_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("unique_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_constant", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("extra_stats", postgresql.JSONB, nullable=False, server_default="{}"),
    )
    op.create_index("ix_dataset_columns_dataset_id", "dataset_columns", ["dataset_id"])

    op.create_table(
        "quality_reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("dataset_id", sa.Integer, sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quality_score", sa.Float, nullable=False),
        sa.Column("profiling_result", postgresql.JSONB, nullable=False),
        sa.Column("quality_issues", postgresql.JSONB, nullable=False),
        sa.Column("numerical_stats", postgresql.JSONB, nullable=False),
        sa.Column("categorical_stats", postgresql.JSONB, nullable=False),
        sa.Column("outliers", postgresql.JSONB, nullable=False),
        sa.Column("correlation", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_quality_reports_dataset_id", "quality_reports", ["dataset_id"])
    op.create_index("ix_quality_reports_created_at", "quality_reports", ["created_at"])

    op.create_table(
        "analysis_history",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("dataset_id", sa.Integer, sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_id", sa.Integer, sa.ForeignKey("quality_reports.id", ondelete="SET NULL"), nullable=True),
        sa.Column("triggered_by", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="success"),
        sa.Column("error_message", sa.String(1024), nullable=True),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_analysis_history_dataset_id", "analysis_history", ["dataset_id"])
    op.create_index("ix_analysis_history_created_at", "analysis_history", ["created_at"])


def downgrade() -> None:
    op.drop_table("analysis_history")
    op.drop_table("quality_reports")
    op.drop_table("dataset_columns")
    op.drop_table("datasets")
    op.drop_table("users")
    # checkfirst=True makes this safe to re-run even if the type was already removed
    # (e.g. a downgrade retried after a partial failure).
    postgresql.ENUM(name="dataset_status").drop(op.get_bind(), checkfirst=True)