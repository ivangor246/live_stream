from collections.abc import Callable
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Select, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import StreamRecord
from app.schemas.stream import Stream, StreamStatus

SessionFactory = Callable[[], AsyncSession]


def _to_stream(record: StreamRecord) -> Stream:
    return Stream(
        id=record.id,
        title=record.title,
        isPrivate=record.is_private,
        status=StreamStatus(record.status),
        viewerCount=record.viewer_count,
        reactionCount=record.reaction_count,
        createdAt=record.created_at,
        startedAt=record.started_at,
        finishedAt=record.finished_at,
    )


class PostgresStreamsRepository:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    async def find_all(self) -> list[Stream]:
        query: Select[tuple[StreamRecord]] = select(StreamRecord).order_by(
            StreamRecord.created_at.desc(),
        )

        async with self._session_factory() as session:
            records = (await session.scalars(query)).all()
            return [_to_stream(record) for record in records]

    async def find_by_id(self, stream_id: str) -> Stream | None:
        async with self._session_factory() as session:
            record = await session.get(StreamRecord, stream_id)
            return _to_stream(record) if record else None

    async def find_stream_key(self, stream_id: str) -> str | None:
        query = select(StreamRecord.stream_key).where(StreamRecord.id == stream_id)

        async with self._session_factory() as session:
            return await session.scalar(query)

    async def find_by_stream_key(self, stream_key: str) -> Stream | None:
        query = select(StreamRecord).where(StreamRecord.stream_key == stream_key)

        async with self._session_factory() as session:
            record = await session.scalar(query)
            return _to_stream(record) if record else None

    async def create(
        self,
        title: str,
        stream_key: str,
        is_private: bool,
    ) -> Stream:
        record = StreamRecord(
            id=str(uuid4()),
            stream_key=stream_key,
            title=title,
            is_private=is_private,
            status=StreamStatus.SCHEDULED.value,
            viewer_count=0,
            reaction_count=0,
            created_at=datetime.now(timezone.utc),
            started_at=None,
            finished_at=None,
        )

        async with self._session_factory() as session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return _to_stream(record)

    async def update(self, stream: Stream) -> Stream:
        async with self._session_factory() as session:
            record = await session.get(StreamRecord, stream.id)

            if record is None:
                raise ValueError(f"Stream {stream.id} does not exist")

            record.title = stream.title
            record.is_private = stream.is_private
            record.status = stream.status.value
            record.viewer_count = stream.viewer_count
            record.reaction_count = stream.reaction_count
            record.created_at = stream.created_at
            record.started_at = stream.started_at
            record.finished_at = stream.finished_at

            await session.commit()
            await session.refresh(record)
            return _to_stream(record)

    async def reset_viewer_counts(self) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(StreamRecord)
                .where(StreamRecord.viewer_count != 0)
                .values(viewer_count=0),
            )
            await session.commit()
