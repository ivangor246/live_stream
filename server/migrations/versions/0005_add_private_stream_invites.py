"""Add private streams and viewer invitations.

Revision ID: 0005_add_private_stream_invites
Revises: 0004_add_user_invites
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_add_private_stream_invites"
down_revision: Union[str, Sequence[str], None] = "0004_add_user_invites"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "streams",
        sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("streams", "is_private", server_default=None)
    op.create_table(
        "stream_viewer_invites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("stream_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["stream_id"], ["streams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_stream_viewer_invites_stream_id",
        "stream_viewer_invites",
        ["stream_id"],
    )
    op.create_index(
        "ix_stream_viewer_invites_expires_at",
        "stream_viewer_invites",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_stream_viewer_invites_expires_at",
        table_name="stream_viewer_invites",
    )
    op.drop_index(
        "ix_stream_viewer_invites_stream_id",
        table_name="stream_viewer_invites",
    )
    op.drop_table("stream_viewer_invites")
    op.drop_column("streams", "is_private")
