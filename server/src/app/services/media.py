from app.schemas.media import StreamConnection


class MediaConnectionService:
    def __init__(
        self,
        rtmp_url: str,
        hls_url: str,
        webrtc_url: str,
    ) -> None:
        self._rtmp_url = rtmp_url.rstrip("/")
        self._hls_url = hls_url.rstrip("/")
        self._webrtc_url = webrtc_url.rstrip("/")

    def get_connection(self, stream_id: str) -> StreamConnection:
        return StreamConnection(
            streamId=stream_id,
            rtmpUrl=self._rtmp_url,
            streamKey=stream_id,
            hlsUrl=f"{self._hls_url}/{stream_id}/index.m3u8",
            webrtcUrl=f"{self._webrtc_url}/{stream_id}",
        )
