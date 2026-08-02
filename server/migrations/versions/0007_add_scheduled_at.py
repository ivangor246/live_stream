"""Add scheduled time to streams.

Revision ID: 0007_add_scheduled_at
Revises: 0006_add_active_users
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_add_scheduled_at"
down_revision: Union[str, Sequence[str], None] = "0006_add_active_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "streams",
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_streams_scheduled_at", "streams", ["scheduled_at"])


def downgrade() -> None:
    op.drop_index("ix_streams_scheduled_at", table_name="streams")
    op.drop_column("streams", "scheduled_at")
