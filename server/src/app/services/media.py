import logging
from urllib.parse import quote, urlencode

import httpx

from app.core.errors import AppError
from app.schemas.media import (
    MediaPathStatus,
    RecordingSegment,
    StreamConnection,
    StreamPlayback,
)
from app.services.media_auth import MediaTokenService

logger = logging.getLogger(__name__)


class MediaPathService:
    def __init__(self, api_url: str, timeout: float) -> None:
        self._api_url = api_url.rstrip("/")
        self._timeout = timeout

    async def ensure_path(self, stream_key: str) -> None:
        get_url = self._get_config_url("get", stream_key)
        add_url = self._get_config_url("add", stream_key)

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                current_response = await client.get(get_url)

                if current_response.status_code == 200:
                    return

                if current_response.status_code != 404:
                    _raise_media_path_error(
                        "MEDIA_PATH_CREATE_FAILED",
                        current_response.status_code,
                    )

                response = await client.post(add_url, json={"source": "publisher"})
        except httpx.HTTPError as error:
            logger.warning("MediaMTX path creation request failed")
            raise AppError(
                503,
                "MEDIA_SERVICE_UNAVAILABLE",
                "The media server is unavailable",
            ) from error

        if response.is_error:
            _raise_media_path_error(
                "MEDIA_PATH_CREATE_FAILED",
                response.status_code,
            )

    async def delete_path(self, stream_key: str) -> None:
        request_url = self._get_config_url("delete", stream_key)

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.delete(request_url)
        except httpx.HTTPError as error:
            logger.warning("MediaMTX path deletion request failed")
            raise AppError(
                503,
                "MEDIA_SERVICE_UNAVAILABLE",
                "The media server is unavailable",
            ) from error

        if response.status_code == 404:
            return

        if response.is_error:
            _raise_media_path_error(
                "MEDIA_PATH_DELETE_FAILED",
                response.status_code,
            )

    def _get_config_url(self, action: str, stream_key: str) -> str:
        encoded_stream_key = quote(stream_key, safe="")
        return f"{self._api_url}/v3/config/paths/{action}/{encoded_stream_key}"


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
        except httpx.HTTPError:
            logger.debug("MediaMTX status request failed")
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

    async def is_available(self) -> bool:
        request_url = f"{self._api_url}/v3/paths/list"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(request_url)
        except httpx.HTTPError:
            logger.debug("MediaMTX health request failed")
            return False

        return not response.is_error


class MediaConnectionService:
    def __init__(
        self,
        rtmp_url: str,
        hls_url: str,
        webrtc_url: str,
        token_service: MediaTokenService,
    ) -> None:
        self._rtmp_url = rtmp_url.rstrip("/")
        self._hls_url = hls_url.rstrip("/")
        self._webrtc_url = webrtc_url.rstrip("/")
        self._token_service = token_service

    def get_connection(
        self,
        stream_id: str,
        stream_key: str,
        path_status: MediaPathStatus,
    ) -> StreamConnection:
        encoded_stream_key = quote(stream_key, safe="")
        publish_token = self._token_service.create(stream_key, "publish")
        playback = self.get_playback(stream_id, stream_key, path_status)
        publish_query = urlencode({"user": "publisher", "pass": publish_token})

        return StreamConnection(
            streamId=stream_id,
            rtmpUrl=self._rtmp_url,
            rtmpPublishUrl=f"{self._rtmp_url}/{encoded_stream_key}?{publish_query}",
            streamKey=stream_key,
            hlsUrl=playback.hls_url,
            webrtcUrl=playback.webrtc_url,
            sourceStatus=playback.source_status,
            sourceProtocol=playback.source_protocol,
        )

    def get_playback(
        self,
        stream_id: str,
        stream_key: str,
        path_status: MediaPathStatus,
    ) -> StreamPlayback:
        encoded_stream_key = quote(stream_key, safe="")
        read_token = self._token_service.create(stream_key, "read")
        read_query = urlencode({"user": "viewer", "pass": read_token})

        return StreamPlayback(
            streamId=stream_id,
            hlsUrl=f"{self._hls_url}/{encoded_stream_key}/index.m3u8?{read_query}",
            webrtcUrl=f"{self._webrtc_url}/{encoded_stream_key}?{read_query}",
            sourceStatus=path_status.source_status,
            sourceProtocol=path_status.source_protocol,
        )


class MediaRecordingService:
    def __init__(
        self,
        api_url: str,
        timeout: float,
        token_service: MediaTokenService,
    ) -> None:
        self._api_url = api_url.rstrip("/")
        self._timeout = timeout
        self._token_service = token_service

    async def get_recordings(self, stream_key: str) -> list[RecordingSegment]:
        token = self._token_service.create(stream_key, "playback")
        query = urlencode({"path": stream_key})
        request_url = f"{self._api_url}/list?{query}"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(request_url, auth=("viewer", token))
        except httpx.HTTPError as error:
            logger.warning("Media recording list request failed")
            raise AppError(
                503,
                "MEDIA_SERVICE_UNAVAILABLE",
                "The media server is unavailable",
            ) from error

        if response.status_code == 404:
            return []

        if response.is_error:
            logger.warning(
                "Media recording list request returned HTTP %s",
                response.status_code,
            )
            raise AppError(
                503,
                "MEDIA_RECORDINGS_UNAVAILABLE",
                "Recordings are unavailable",
            )

        try:
            payload = response.json()
        except ValueError as error:
            raise AppError(
                503,
                "MEDIA_RECORDINGS_UNAVAILABLE",
                "Recordings are unavailable",
            ) from error

        if not isinstance(payload, list):
            raise AppError(
                503,
                "MEDIA_RECORDINGS_UNAVAILABLE",
                "Recordings are unavailable",
            )

        recordings: list[RecordingSegment] = []
        for item in payload:
            recording = self._to_recording(item)
            if recording is not None:
                recordings.append(recording)

        return recordings

    async def open_recording(
        self,
        stream_key: str,
        start: str,
        duration: float,
        byte_range: str | None,
    ) -> "MediaRecordingResponse":
        token = self._token_service.create(stream_key, "playback")
        query = urlencode(
            {
                "path": stream_key,
                "start": start,
                "duration": duration,
                "format": "mp4",
            },
        )
        request_url = f"{self._api_url}/get?{query}"
        headers = {"Range": byte_range} if byte_range else {}
        client = httpx.AsyncClient(
            timeout=self._timeout,
            auth=("viewer", token),
        )

        try:
            request = client.build_request(
                "GET",
                request_url,
                headers=headers,
            )
            response = await client.send(request, stream=True)
        except httpx.HTTPError as error:
            await client.aclose()
            logger.warning("Media recording request failed")
            raise AppError(
                503,
                "MEDIA_SERVICE_UNAVAILABLE",
                "The media server is unavailable",
            ) from error

        if response.is_error:
            await response.aclose()
            await client.aclose()
            if response.status_code == 404:
                raise AppError(404, "RECORDING_NOT_FOUND", "Recording was not found")

            logger.warning(
                "Media recording request returned HTTP %s",
                response.status_code,
            )
            raise AppError(
                503,
                "MEDIA_RECORDINGS_UNAVAILABLE",
                "Recordings are unavailable",
            )

        return MediaRecordingResponse(client, response)

    def _to_recording(
        self,
        item: object,
    ) -> RecordingSegment | None:
        if not isinstance(item, dict):
            return None

        start = item.get("start")
        duration = item.get("duration")
        if not isinstance(start, str) or not isinstance(duration, (int, float)):
            return None

        if duration <= 0:
            return None

        return RecordingSegment(
            startAt=start,
            durationSeconds=duration,
        )


class MediaRecordingResponse:
    def __init__(
        self,
        client: httpx.AsyncClient,
        response: httpx.Response,
    ) -> None:
        self._client = client
        self._response = response

    @property
    def content_type(self) -> str:
        return self._response.headers.get("content-type", "video/mp4")

    @property
    def headers(self) -> dict[str, str]:
        return {
            header: value
            for header in ("content-length", "content-range", "accept-ranges")
            if (value := self._response.headers.get(header)) is not None
        }

    @property
    def status_code(self) -> int:
        return self._response.status_code

    async def iter_bytes(self):
        async for chunk in self._response.aiter_bytes():
            yield chunk

    async def close(self) -> None:
        await self._response.aclose()
        await self._client.aclose()


def _raise_media_path_error(code: str, status_code: int) -> None:
    logger.warning(
        "MediaMTX path request returned HTTP %s",
        status_code,
    )
    raise AppError(
        503,
        code,
        "The media path could not be updated",
    )
