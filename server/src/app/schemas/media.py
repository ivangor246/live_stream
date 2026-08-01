from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MediaSourceStatus = Literal["online", "offline", "unavailable"]
MediaAuthAction = Literal["publish", "read", "playback", "api", "metrics", "pprof"]


class MediaAuthRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user: str | None = ""
    password: str | None = ""
    token: str | None = ""
    ip: str | None = ""
    action: MediaAuthAction
    path: str | None = ""
    protocol: str | None = ""
    id: str | None = ""
    query: str | None = ""
    user_agent: str | None = Field(default="", alias="userAgent")


class MediaPathStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    source_status: MediaSourceStatus = Field(alias="sourceStatus")
    source_protocol: str | None = Field(default=None, alias="sourceProtocol")


class StreamPlayback(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    stream_id: str = Field(alias="streamId")
    hls_url: str = Field(alias="hlsUrl")
    webrtc_url: str = Field(alias="webrtcUrl")
    source_status: MediaSourceStatus = Field(alias="sourceStatus")
    source_protocol: str | None = Field(default=None, alias="sourceProtocol")


class StreamConnection(StreamPlayback):
    rtmp_url: str = Field(alias="rtmpUrl")
    rtmp_publish_url: str = Field(alias="rtmpPublishUrl")
    stream_key: str = Field(alias="streamKey")


class RecordingSegment(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    start_at: datetime = Field(alias="startAt")
    duration_seconds: float = Field(alias="durationSeconds", gt=0)
