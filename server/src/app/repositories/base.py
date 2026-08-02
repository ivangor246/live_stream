from datetime import datetime
from typing import Protocol

from app.schemas.stream import Stream


class StreamsRepository(Protocol):
    async def find_all(self) -> list[Stream]: ...

    async def find_by_id(self, stream_id: str) -> Stream | None: ...

    async def create(
        self,
        title: str,
        stream_key: str,
        is_private: bool,
        scheduled_at: datetime | None,
    ) -> Stream: ...

    async def find_stream_key(self, stream_id: str) -> str | None: ...

    async def find_by_stream_key(self, stream_key: str) -> Stream | None: ...

    async def update(self, stream: Stream) -> Stream: ...

    async def reset_viewer_counts(self) -> None: ...
