from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MediaSourceStatus = Literal["online", "offline", "unavailable"]
MediaAuthAction = Literal["publish", "read", "playback", "api", "metrics", "pprof"]


class MediaAuthRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user: str = ""
    password: str = ""
    token: str = ""
    ip: str = ""
    action: MediaAuthAction
    path: str = ""
    protocol: str = ""
    id: str = ""
    query: str = ""
    user_agent: str = Field(default="", alias="userAgent")


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
