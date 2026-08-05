import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from io import StringIO

from app.repositories.base import StreamsRepository
from app.schemas.export import StreamExportFormat
from app.schemas.stream import Stream


@dataclass(frozen=True)
class StreamExport:
    content: bytes
    filename: str
    media_type: str


class StreamExportService:
    def __init__(self, streams_repository: StreamsRepository) -> None:
        self._streams_repository = streams_repository

    async def create_export(self, export_format: StreamExportFormat) -> StreamExport:
        streams = await self._streams_repository.find_all()
        filename_stem = datetime.now(timezone.utc).strftime("live-streams-%Y-%m-%d")

        if export_format is StreamExportFormat.JSON:
            return StreamExport(
                content=self._to_json(streams),
                filename=f"{filename_stem}.json",
                media_type="application/json",
            )

        return StreamExport(
            content=self._to_csv(streams),
            filename=f"{filename_stem}.csv",
            media_type="text/csv",
        )

    def _to_json(self, streams: list[Stream]) -> bytes:
        payload = [
            stream.model_dump(by_alias=True, mode="json", exclude={"can_manage"})
            for stream in streams
        ]
        return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    def _to_csv(self, streams: list[Stream]) -> bytes:
        fieldnames = (
            "id",
            "title",
            "isPrivate",
            "status",
            "viewerCount",
            "reactionCount",
            "createdAt",
            "scheduledAt",
            "startedAt",
            "finishedAt",
        )
        output = StringIO(newline="")
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for stream in streams:
            row = stream.model_dump(by_alias=True, mode="json", exclude={"can_manage"})
            row["isPrivate"] = str(row["isPrivate"]).lower()
            writer.writerow(row)

        return ("\ufeff" + output.getvalue()).encode("utf-8")
