from pydantic import BaseModel, ConfigDict, Field


class StreamConnection(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    stream_id: str = Field(alias="streamId")
    rtmp_url: str = Field(alias="rtmpUrl")
    stream_key: str = Field(alias="streamKey")
    hls_url: str = Field(alias="hlsUrl")
    webrtc_url: str = Field(alias="webrtcUrl")
