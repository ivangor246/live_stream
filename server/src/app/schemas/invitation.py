from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.media import StreamPlayback
from app.schemas.stream import Stream


class StreamViewerInvitation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    stream_id: str = Field(alias="streamId")
    created_at: datetime = Field(alias="createdAt")
    expires_at: datetime = Field(alias="expiresAt")


class CreatedStreamViewerInvitation(StreamViewerInvitation):
    token: str


class ViewerInvitationPlayback(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stream: Stream
    playback: StreamPlayback
