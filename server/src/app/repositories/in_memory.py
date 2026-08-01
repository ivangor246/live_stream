from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.stream import Stream, StreamStatus


class InMemoryStreamsRepository:
    def __init__(self) -> None:
        self._streams: dict[str, Stream] = {}

    def find_all(self) -> list[Stream]:
        return [stream.model_copy(deep=True) for stream in self._streams.values()]

    def find_by_id(self, stream_id: str) -> Stream | None:
        stream = self._streams.get(stream_id)
        return stream.model_copy(deep=True) if stream else None

    def create(self, title: str) -> Stream:
        stream = Stream(
            id=str(uuid4()),
            title=title,
            status=StreamStatus.SCHEDULED,
            viewer_count=0,
            reaction_count=0,
            created_at=datetime.now(timezone.utc),
            started_at=None,
            finished_at=None,
        )
        self._streams[stream.id] = stream
        return stream.model_copy(deep=True)

    def update(self, stream: Stream) -> Stream:
        saved_stream = stream.model_copy(deep=True)
        self._streams[saved_stream.id] = saved_stream
        return saved_stream.model_copy(deep=True)
