import base64
import hashlib
import hmac
import time
from urllib.parse import parse_qs

from app.core.errors import AppError
from app.repositories.base import StreamsRepository
from app.schemas.media import MediaAuthAction, MediaAuthRequest
from app.schemas.stream import StreamStatus


class MediaTokenService:
    def __init__(self, secret: str, ttl_seconds: int) -> None:
        self._secret = secret.encode("utf-8")
        self._ttl_seconds = ttl_seconds

    def create(self, path: str, action: MediaAuthAction) -> str:
        expires_at = ((int(time.time()) // self._ttl_seconds) + 1) * self._ttl_seconds
        signature = self._sign(path, action, expires_at)
        return f"{expires_at}.{signature}"

    def verify(
        self,
        token: str,
        path: str,
        action: MediaAuthAction,
    ) -> bool:
        try:
            expires_value, signature = token.split(".", maxsplit=1)
            expires_at = int(expires_value)
        except (ValueError, AttributeError):
            return False

        if expires_at <= int(time.time()):
            return False

        expected_signature = self._sign(path, action, expires_at)
        return hmac.compare_digest(signature, expected_signature)

    def _sign(self, path: str, action: MediaAuthAction, expires_at: int) -> str:
        payload = f"{path}:{action}:{expires_at}".encode("utf-8")
        digest = hmac.new(self._secret, payload, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


class MediaAuthService:
    def __init__(
        self,
        streams_repository: StreamsRepository,
        token_service: MediaTokenService,
    ) -> None:
        self._streams_repository = streams_repository
        self._token_service = token_service

    async def authorize(self, request: MediaAuthRequest) -> None:
        if request.action in {"api", "metrics", "pprof"}:
            return

        path = request.path or _get_query_value(request.query or "", "path")
        stream = await self._streams_repository.find_by_stream_key(path)
        token = request.password or request.token or _get_query_token(request.query or "")
        is_allowed_status = stream is not None and (
            stream.status is StreamStatus.LIVE
            or (
                request.action == "playback"
                and stream.status is StreamStatus.FINISHED
            )
        )

        if (
            not is_allowed_status
            or not self._token_service.verify(token, path, request.action)
        ):
            raise AppError(
                401,
                "MEDIA_AUTH_FAILED",
                "Media authentication failed",
            )


def _get_query_token(query: str) -> str:
    for key in ("pass", "token"):
        value = _get_query_value(query, key)
        if value:
            return value
    return ""


def _get_query_value(query: str, key: str) -> str:
    values = parse_qs(query, keep_blank_values=True)
    return values.get(key, [""])[0]
