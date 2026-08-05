"""Add guest stream ownership.

Revision ID: 0008_add_guest_stream_owners
Revises: 0007_add_scheduled_at
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_add_guest_stream_owners"
down_revision: Union[str, Sequence[str], None] = "0007_add_scheduled_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "streams",
        sa.Column("guest_owner_token_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_streams_guest_owner_token_hash",
        "streams",
        ["guest_owner_token_hash"],
    )


def downgrade() -> None:
    op.drop_index("ix_streams_guest_owner_token_hash", table_name="streams")
    op.drop_column("streams", "guest_owner_token_hash")
