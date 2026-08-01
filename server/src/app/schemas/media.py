from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MediaSourceStatus = Literal["online", "offline", "unavailable"]


class MediaPathStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    source_status: MediaSourceStatus = Field(alias="sourceStatus")
    source_protocol: str | None = Field(default=None, alias="sourceProtocol")


class StreamConnection(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    stream_id: str = Field(alias="streamId")
    rtmp_url: str = Field(alias="rtmpUrl")
    stream_key: str = Field(alias="streamKey")
    hls_url: str = Field(alias="hlsUrl")
    webrtc_url: str = Field(alias="webrtcUrl")
    source_status: MediaSourceStatus = Field(alias="sourceStatus")
    source_protocol: str | None = Field(default=None, alias="sourceProtocol")
