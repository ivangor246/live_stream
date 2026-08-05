from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StreamStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"


class Stream(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    title: str
    is_private: bool = Field(alias="isPrivate")
    status: StreamStatus
    viewer_count: int = Field(alias="viewerCount", ge=0)
    reaction_count: int = Field(alias="reactionCount", ge=0)
    created_at: datetime = Field(alias="createdAt")
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    started_at: datetime | None = Field(default=None, alias="startedAt")
    finished_at: datetime | None = Field(default=None, alias="finishedAt")
    can_manage: bool = Field(default=False, alias="canManage")


class CreateStreamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: str = Field(min_length=3, max_length=100)
    is_private: bool = Field(default=False, alias="isPrivate")
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator("scheduled_at")
    @classmethod
    def normalize_scheduled_at(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None

        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Scheduled time must include a timezone")

        return value.astimezone(timezone.utc)
