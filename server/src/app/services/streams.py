import asyncio
from collections.abc import Callable
from datetime import datetime, timezone
import secrets

from app.core.errors import AppError
from app.repositories.base import StreamsRepository
from app.schemas.stream import Stream, StreamStatus
from app.services.media import MediaPathService

StatusUpdateListener = Callable[[Stream], None]


class StreamsService:
    def __init__(
        self,
        streams_repository: StreamsRepository,
        media_path_service: MediaPathService,
    ) -> None:
        self._streams_repository = streams_repository
        self._media_path_service = media_path_service
        self._status_update_listeners: set[StatusUpdateListener] = set()
        self._stream_viewers: dict[str, set[str]] = {}
        self._mutation_lock = asyncio.Lock()

    def subscribe_to_status_updates(self, listener: StatusUpdateListener) -> Callable[[], None]:
        self._status_update_listeners.add(listener)

        def unsubscribe() -> None:
            self._status_update_listeners.discard(listener)

        return unsubscribe

    def _notify_status_updated(self, stream: Stream) -> None:
        for listener in tuple(self._status_update_listeners):
            listener(stream)

    async def get_streams(self) -> list[Stream]:
        return await self._streams_repository.find_all()

    async def get_stream(self, stream_id: str) -> Stream:
        stream = await self._streams_repository.find_by_id(stream_id)

        if not stream:
            raise AppError(404, "STREAM_NOT_FOUND", "Stream was not found")

        return stream

    async def create_stream(
        self,
        title: str,
        is_private: bool,
        scheduled_at: datetime | None,
    ) -> Stream:
        return await self._streams_repository.create(
            title,
            secrets.token_urlsafe(32),
            is_private,
            scheduled_at,
        )

    async def get_stream_key(self, stream_id: str) -> str:
        stream_key = await self._streams_repository.find_stream_key(stream_id)

        if not stream_key:
            raise AppError(404, "STREAM_NOT_FOUND", "Stream was not found")

        return stream_key

    async def start_stream(self, stream_id: str) -> Stream:
        async with self._mutation_lock:
            stream = await self.get_stream(stream_id)

            if stream.status is StreamStatus.LIVE:
                raise AppError(409, "STREAM_ALREADY_LIVE", "Stream is already live")

            if stream.status is StreamStatus.FINISHED:
                raise AppError(
                    409,
                    "STREAM_ALREADY_FINISHED",
                    "Finished stream cannot be started",
                )

            stream_key = await self.get_stream_key(stream_id)
            await self._media_path_service.ensure_path(stream_key)

            updated_stream = stream.model_copy(
                update={
                    "status": StreamStatus.LIVE,
                    "started_at": datetime.now(timezone.utc),
                },
            )
            saved_stream = await self._streams_repository.update(updated_stream)
            self._notify_status_updated(saved_stream)
            return saved_stream

    async def finish_stream(self, stream_id: str) -> Stream:
        async with self._mutation_lock:
            stream = await self.get_stream(stream_id)

            if stream.status is StreamStatus.SCHEDULED:
                raise AppError(
                    409,
                    "STREAM_NOT_LIVE",
                    "Scheduled stream cannot be finished",
                )

            if stream.status is StreamStatus.FINISHED:
                raise AppError(
                    409,
                    "STREAM_ALREADY_FINISHED",
                    "Stream is already finished",
                )

            updated_stream = stream.model_copy(
                update={
                    "status": StreamStatus.FINISHED,
                    "finished_at": datetime.now(timezone.utc),
                },
            )
            saved_stream = await self._streams_repository.update(updated_stream)
            self._notify_status_updated(saved_stream)
            return saved_stream

    async def add_viewer(self, stream_id: str, viewer_id: str) -> Stream:
        async with self._mutation_lock:
            stream = await self.get_stream(stream_id)

            if stream.status is not StreamStatus.LIVE:
                raise AppError(
                    409,
                    "STREAM_NOT_LIVE",
                    "Viewer can only join a live stream",
                )

            viewers = self._stream_viewers.setdefault(stream_id, set())
            viewers.add(viewer_id)

            return await self._streams_repository.update(
                stream.model_copy(update={"viewer_count": len(viewers)}),
            )

    async def remove_viewer(self, stream_id: str, viewer_id: str) -> Stream | None:
        async with self._mutation_lock:
            viewers = self._stream_viewers.get(stream_id)

            if not viewers or viewer_id not in viewers:
                return None

            viewers.remove(viewer_id)

            if not viewers:
                self._stream_viewers.pop(stream_id, None)

            stream = await self._streams_repository.find_by_id(stream_id)

            if not stream:
                return None

            return await self._streams_repository.update(
                stream.model_copy(update={"viewer_count": len(viewers)}),
            )

    async def add_reaction(self, stream_id: str, viewer_id: str, _reaction: str) -> Stream:
        async with self._mutation_lock:
            stream = await self.get_stream(stream_id)

            if stream.status is not StreamStatus.LIVE:
                raise AppError(
                    409,
                    "STREAM_NOT_LIVE",
                    "Reactions are only accepted for live streams",
                )

            viewers = self._stream_viewers.get(stream_id)

            if not viewers or viewer_id not in viewers:
                raise AppError(
                    403,
                    "VIEWER_NOT_CONNECTED",
                    "Viewer is not connected to this stream",
                )

            return await self._streams_repository.update(
                stream.model_copy(
                    update={"reaction_count": stream.reaction_count + 1},
                ),
            )
