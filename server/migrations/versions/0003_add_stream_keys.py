"""Add random media keys to streams.

Revision ID: 0003_add_stream_keys
Revises: 0002_add_auth
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_stream_keys"
down_revision: Union[str, Sequence[str], None] = "0002_add_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "streams",
        sa.Column("stream_key", sa.String(length=64), nullable=True),
    )
    op.execute(sa.text("UPDATE streams SET stream_key = id WHERE stream_key IS NULL"))
    op.alter_column("streams", "stream_key", nullable=False)
    op.create_unique_constraint("uq_streams_stream_key", "streams", ["stream_key"])


def downgrade() -> None:
    op.drop_constraint("uq_streams_stream_key", "streams", type_="unique")
    op.drop_column("streams", "stream_key")
