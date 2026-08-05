import hashlib
import secrets
from datetime import timedelta

from fastapi import Request, Response
from starlette.requests import HTTPConnection


class GuestSessionService:
    def __init__(
        self,
        cookie_name: str,
        ttl_days: int,
        secure_cookie: bool,
    ) -> None:
        self._cookie_name = cookie_name
        self._ttl = timedelta(days=ttl_days)
        self._secure_cookie = secure_cookie

    def get_token_hash(self, connection: HTTPConnection) -> str | None:
        token = connection.cookies.get(self._cookie_name)
        return _hash_token(token) if token else None

    def get_or_create_token_hash(self, request: Request, response: Response) -> str:
        token = request.cookies.get(self._cookie_name)
        if token:
            return _hash_token(token)

        token = secrets.token_urlsafe(32)
        response.set_cookie(
            self._cookie_name,
            token,
            max_age=int(self._ttl.total_seconds()),
            httponly=True,
            secure=self._secure_cookie,
            samesite="lax",
            path="/",
        )
        return _hash_token(token)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
