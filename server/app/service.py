from collections.abc import Callable
from datetime import datetime, timezone

from .errors import AppError
from .models import Stream, StreamStatus
from .repository import StreamsRepository

StatusUpdateListener = Callable[[Stream], None]


class StreamsService:
    def __init__(self, streams_repository: StreamsRepository) -> None:
        self._streams_repository = streams_repository
        self._status_update_listeners: set[StatusUpdateListener] = set()
        self._stream_viewers: dict[str, set[str]] = {}

    def subscribe_to_status_updates(self, listener: StatusUpdateListener) -> Callable[[], None]:
        self._status_update_listeners.add(listener)

        def unsubscribe() -> None:
            self._status_update_listeners.discard(listener)

        return unsubscribe

    def _notify_status_updated(self, stream: Stream) -> None:
        for listener in tuple(self._status_update_listeners):
            listener(stream)

    def get_streams(self) -> list[Stream]:
        return self._streams_repository.find_all()

    def get_stream(self, stream_id: str) -> Stream:
        stream = self._streams_repository.find_by_id(stream_id)

        if not stream:
            raise AppError(404, "STREAM_NOT_FOUND", "Stream was not found")

        return stream

    def create_stream(self, title: str) -> Stream:
        return self._streams_repository.create(title)

    def start_stream(self, stream_id: str) -> Stream:
        stream = self.get_stream(stream_id)

        if stream.status is StreamStatus.LIVE:
            raise AppError(409, "STREAM_ALREADY_LIVE", "Stream is already live")

        if stream.status is StreamStatus.FINISHED:
            raise AppError(
                409,
                "STREAM_ALREADY_FINISHED",
                "Finished stream cannot be started",
            )

        updated_stream = stream.model_copy(
            update={
                "status": StreamStatus.LIVE,
                "started_at": datetime.now(timezone.utc),
            },
        )
        saved_stream = self._streams_repository.update(updated_stream)
        self._notify_status_updated(saved_stream)
        return saved_stream

    def finish_stream(self, stream_id: str) -> Stream:
        stream = self.get_stream(stream_id)

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
        saved_stream = self._streams_repository.update(updated_stream)
        self._notify_status_updated(saved_stream)
        return saved_stream

    def add_viewer(self, stream_id: str, viewer_id: str) -> Stream:
        stream = self.get_stream(stream_id)

        if stream.status is not StreamStatus.LIVE:
            raise AppError(
                409,
                "STREAM_NOT_LIVE",
                "Viewer can only join a live stream",
            )

        viewers = self._stream_viewers.setdefault(stream_id, set())
        viewers.add(viewer_id)

        return self._streams_repository.update(
            stream.model_copy(update={"viewer_count": len(viewers)}),
        )

    def remove_viewer(self, stream_id: str, viewer_id: str) -> Stream | None:
        viewers = self._stream_viewers.get(stream_id)

        if not viewers or viewer_id not in viewers:
            return None

        viewers.remove(viewer_id)

        if not viewers:
            self._stream_viewers.pop(stream_id, None)

        stream = self._streams_repository.find_by_id(stream_id)

        if not stream:
            return None

        return self._streams_repository.update(
            stream.model_copy(update={"viewer_count": len(viewers)}),
        )

    def add_reaction(self, stream_id: str, viewer_id: str, _reaction: str) -> Stream:
        stream = self.get_stream(stream_id)

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

        return self._streams_repository.update(
            stream.model_copy(
                update={"reaction_count": stream.reaction_count + 1},
            ),
        )
