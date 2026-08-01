from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import StreamViewerInviteRecord

SessionFactory = Callable[[], AsyncSession]


class PostgresStreamViewerInvitesRepository:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    async def create(
        self,
        stream_id: str,
        token_hash: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> StreamViewerInviteRecord:
        record = StreamViewerInviteRecord(
            id=str(uuid4()),
            stream_id=stream_id,
            token_hash=token_hash,
            created_at=created_at,
            expires_at=expires_at,
        )

        async with self._session_factory() as session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record

    async def find_active(
        self,
        token_hash: str,
        current_time: datetime,
    ) -> StreamViewerInviteRecord | None:
        query = select(StreamViewerInviteRecord).where(
            StreamViewerInviteRecord.token_hash == token_hash,
            StreamViewerInviteRecord.expires_at > current_time,
        )

        async with self._session_factory() as session:
            return await session.scalar(query)

    async def find_active_for_stream(
        self,
        stream_id: str,
        current_time: datetime,
    ) -> list[StreamViewerInviteRecord]:
        query = (
            select(StreamViewerInviteRecord)
            .where(
                StreamViewerInviteRecord.stream_id == stream_id,
                StreamViewerInviteRecord.expires_at > current_time,
            )
            .order_by(StreamViewerInviteRecord.created_at.desc())
        )

        async with self._session_factory() as session:
            return list((await session.scalars(query)).all())

    async def delete(self, invitation_id: str, stream_id: str) -> bool:
        async with self._session_factory() as session:
            invitation = await session.get(StreamViewerInviteRecord, invitation_id)
            if invitation is None or invitation.stream_id != stream_id:
                return False

            await session.delete(invitation)
            await session.commit()
            return True
