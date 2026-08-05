import asyncio
from datetime import datetime, timezone
from unittest import IsolatedAsyncioTestCase

from app.core.errors import AppError
from app.schemas.stream import Stream, StreamStatus
from app.services.streams import StreamsService


class InMemoryStreamsRepository:
    def __init__(self, stream: Stream) -> None:
        self.stream = stream

    async def find_all(self) -> list[Stream]:
        return [self.stream]

    async def find_by_id(self, stream_id: str) -> Stream | None:
        await asyncio.sleep(0)
        return self.stream if self.stream.id == stream_id else None

    async def create(
        self,
        title: str,
        stream_key: str,
        is_private: bool,
        scheduled_at: datetime | None,
        guest_owner_token_hash: str | None,
    ) -> Stream:
        raise NotImplementedError

    async def find_stream_key(self, stream_id: str) -> str | None:
        return "stream-key" if self.stream.id == stream_id else None

    async def find_by_stream_key(self, stream_key: str) -> Stream | None:
        return self.stream if stream_key == "stream-key" else None

    async def find_guest_owned_stream_ids(self, token_hash: str) -> set[str]:
        return set()

    async def update(self, stream: Stream) -> Stream:
        await asyncio.sleep(0)
        self.stream = stream
        return stream

    async def reset_viewer_counts(self) -> None:
        self.stream = self.stream.model_copy(update={"viewer_count": 0})


class DelayedMediaPathService:
    def __init__(self) -> None:
        self.ensure_path_calls = 0

    async def ensure_path(self, _stream_key: str) -> None:
        self.ensure_path_calls += 1
        await asyncio.sleep(0)


def create_stream(status: StreamStatus = StreamStatus.LIVE) -> Stream:
    now = datetime.now(timezone.utc)
    return Stream(
        id="stream-id",
        title="Test stream",
        isPrivate=False,
        status=status,
        viewerCount=1,
        reactionCount=0,
        createdAt=now,
        scheduledAt=None,
        startedAt=now if status is StreamStatus.LIVE else None,
        finishedAt=None,
    )


class StreamsServiceConcurrencyTests(IsolatedAsyncioTestCase):
    async def test_concurrent_reactions_preserve_each_increment(self) -> None:
        repository = InMemoryStreamsRepository(create_stream())
        service = StreamsService(repository, DelayedMediaPathService())
        service._stream_viewers["stream-id"] = {"viewer-id"}

        await asyncio.gather(
            service.add_reaction("stream-id", "viewer-id", "like"),
            service.add_reaction("stream-id", "viewer-id", "clap"),
        )

        self.assertEqual(repository.stream.reaction_count, 2)

    async def test_only_one_parallel_start_changes_the_lifecycle(self) -> None:
        repository = InMemoryStreamsRepository(create_stream(StreamStatus.SCHEDULED))
        media_path_service = DelayedMediaPathService()
        service = StreamsService(repository, media_path_service)

        results = await asyncio.gather(
            service.start_stream("stream-id"),
            service.start_stream("stream-id"),
            return_exceptions=True,
        )

        self.assertEqual(repository.stream.status, StreamStatus.LIVE)
        self.assertEqual(media_path_service.ensure_path_calls, 1)
        self.assertEqual(sum(isinstance(result, Stream) for result in results), 1)
        self.assertEqual(sum(isinstance(result, AppError) for result in results), 1)

    async def test_finish_cannot_be_overwritten_by_a_parallel_reaction(self) -> None:
        repository = InMemoryStreamsRepository(create_stream())
        service = StreamsService(repository, DelayedMediaPathService())
        service._stream_viewers["stream-id"] = {"viewer-id"}

        await asyncio.gather(
            service.finish_stream("stream-id"),
            service.add_reaction("stream-id", "viewer-id", "fire"),
            return_exceptions=True,
        )

        self.assertEqual(repository.stream.status, StreamStatus.FINISHED)
