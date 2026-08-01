from typing import Protocol

from .models import Stream, create_stream


class StreamsRepository(Protocol):
    def find_all(self) -> list[Stream]: ...

    def find_by_id(self, stream_id: str) -> Stream | None: ...

    def create(self, title: str) -> Stream: ...

    def update(self, stream: Stream) -> Stream: ...


class InMemoryStreamsRepository:
    def __init__(self) -> None:
        self._streams: dict[str, Stream] = {}

    def find_all(self) -> list[Stream]:
        return [stream.model_copy(deep=True) for stream in self._streams.values()]

    def find_by_id(self, stream_id: str) -> Stream | None:
        stream = self._streams.get(stream_id)
        return stream.model_copy(deep=True) if stream else None

    def create(self, title: str) -> Stream:
        stream = create_stream(title)
        self._streams[stream.id] = stream
        return stream.model_copy(deep=True)

    def update(self, stream: Stream) -> Stream:
        saved_stream = stream.model_copy(deep=True)
        self._streams[saved_stream.id] = saved_stream
        return saved_stream.model_copy(deep=True)
