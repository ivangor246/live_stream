import logging
from urllib.parse import quote

import httpx

from app.core.errors import AppError
from app.schemas.media import MediaPathStatus, StreamConnection

logger = logging.getLogger(__name__)


class MediaStatusService:
    def __init__(self, api_url: str, timeout: float) -> None:
        self._api_url = api_url.rstrip("/")
        self._timeout = timeout

    async def get_path_status(self, stream_key: str) -> MediaPathStatus:
        encoded_stream_key = quote(stream_key, safe="")
        request_url = f"{self._api_url}/v3/paths/get/{encoded_stream_key}"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(request_url)
        except httpx.HTTPError as error:
            logger.debug("MediaMTX status request failed: %s", error)
            return MediaPathStatus(sourceStatus="unavailable")

        if response.status_code == 404:
            return MediaPathStatus(sourceStatus="offline")

        if response.is_error:
            logger.debug(
                "MediaMTX status request returned HTTP %s",
                response.status_code,
            )
            return MediaPathStatus(sourceStatus="unavailable")

        try:
            response_body = response.json()
        except ValueError:
            logger.debug("MediaMTX status response was not valid JSON")
            return MediaPathStatus(sourceStatus="unavailable")

        if not isinstance(response_body, dict):
            return MediaPathStatus(sourceStatus="unavailable")

        path = response_body.get("item", response_body)
        if not isinstance(path, dict):
            return MediaPathStatus(sourceStatus="unavailable")

        source = path.get("source")
        source_protocol = (
            source.get("type")
            if isinstance(source, dict) and isinstance(source.get("type"), str)
            else None
        )

        return MediaPathStatus(
            sourceStatus="online" if path.get("ready") is True else "offline",
            sourceProtocol=source_protocol,
        )


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

    def get_connection(
        self,
        stream_id: str,
        stream_key: str,
        path_status: MediaPathStatus,
    ) -> StreamConnection:
        return StreamConnection(
            streamId=stream_id,
            rtmpUrl=self._rtmp_url,
            streamKey=stream_key,
            hlsUrl=f"{self._hls_url}/{stream_key}/index.m3u8",
            webrtcUrl=f"{self._webrtc_url}/{stream_key}",
            sourceStatus=path_status.source_status,
            sourceProtocol=path_status.source_protocol,
        )
