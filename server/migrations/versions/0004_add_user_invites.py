"""Add user invitation links.

Revision ID: 0004_add_user_invites
Revises: 0003_add_stream_keys
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_add_user_invites"
down_revision: Union[str, Sequence[str], None] = "0003_add_stream_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_invites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_user_invites_expires_at",
        "user_invites",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_invites_expires_at", table_name="user_invites")
    op.drop_table("user_invites")
