import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response, WebSocket
from sqlalchemy.exc import IntegrityError

from app.core.errors import AppError
from app.repositories.auth import PostgresAuthRepository
from app.schemas.auth import (
    AuthLoginRequest,
    AuthResponse,
    AuthSetupRequest,
    AuthStatus,
    AuthUser,
)
from app.utils.passwords import hash_password, verify_password


class AuthService:
    def __init__(
        self,
        repository: PostgresAuthRepository,
        cookie_name: str,
        session_ttl_days: int,
        secure_cookie: bool,
    ) -> None:
        self._repository = repository
        self._cookie_name = cookie_name
        self._session_ttl = timedelta(days=session_ttl_days)
        self._secure_cookie = secure_cookie

    async def get_status(self, request: Request) -> AuthStatus:
        user = await self._get_user_from_token(request.cookies.get(self._cookie_name))
        return AuthStatus(
            setupRequired=not await self._repository.has_users(),
            authenticated=user is not None,
            user=_to_auth_user(user) if user else None,
        )

    async def setup(
        self,
        request: AuthSetupRequest,
        response: Response,
    ) -> AuthResponse:
        if await self._repository.has_users():
            raise AppError(
                409,
                "AUTH_SETUP_COMPLETE",
                "The administrator account is already configured",
            )

        username = _normalize_username(request.username)
        if not username:
            raise AppError(
                400,
                "VALIDATION_ERROR",
                "Username must contain at least one non-space character",
            )

        password_salt, password_hash = hash_password(request.password)

        try:
            user = await self._repository.create_user(
                username=username,
                password_hash=password_hash,
                password_salt=password_salt,
                created_at=_utc_now(),
            )
        except IntegrityError as error:
            raise AppError(
                409,
                "AUTH_SETUP_COMPLETE",
                "The administrator account is already configured",
            ) from error

        await self._start_session(user.id, response)
        return AuthResponse(user=_to_auth_user(user))

    async def login(
        self,
        request: AuthLoginRequest,
        response: Response,
    ) -> AuthResponse:
        username = _normalize_username(request.username)
        user = await self._repository.find_user_by_username(username)

        if user is None or not verify_password(
            request.password,
            user.password_salt,
            user.password_hash,
        ):
            raise AppError(
                401,
                "AUTH_INVALID_CREDENTIALS",
                "The username or password is incorrect",
            )

        await self._start_session(user.id, response)
        return AuthResponse(user=_to_auth_user(user))

    async def logout(self, request: Request, response: Response) -> None:
        token = request.cookies.get(self._cookie_name)
        if token:
            await self._repository.delete_session(_hash_session_token(token))

        response.delete_cookie(self._cookie_name, path="/")

    async def require_admin(self, request: Request) -> AuthUser:
        user = await self.require_user(request)
        if user.role != "admin":
            raise _forbidden_error()

        return user

    async def require_operator(self, request: Request) -> AuthUser:
        user = await self.require_user(request)
        if user.role not in {"admin", "operator"}:
            raise _forbidden_error()

        return user

    async def require_user(self, request: Request) -> AuthUser:
        user = await self._get_user_from_token(request.cookies.get(self._cookie_name))
        if user is None:
            raise _unauthorized_error()

        return _to_auth_user(user)

    async def require_websocket_user(self, websocket: WebSocket) -> AuthUser:
        user = await self._get_user_from_token(
            websocket.cookies.get(self._cookie_name),
        )
        if user is None:
            raise _unauthorized_error()

        return _to_auth_user(user)

    async def _start_session(self, user_id: str, response: Response) -> None:
        session_token = secrets.token_urlsafe(32)
        created_at = _utc_now()
        expires_at = created_at + self._session_ttl

        await self._repository.create_session(
            session_id=_hash_session_token(session_token),
            user_id=user_id,
            created_at=created_at,
            expires_at=expires_at,
        )
        response.set_cookie(
            self._cookie_name,
            session_token,
            max_age=int(self._session_ttl.total_seconds()),
            httponly=True,
            secure=self._secure_cookie,
            samesite="lax",
            path="/",
        )

    async def _get_user_from_token(self, token: str | None):
        if not token:
            return None

        return await self._repository.find_user_by_session(
            _hash_session_token(token),
            _utc_now(),
        )


def _to_auth_user(record) -> AuthUser:
    return AuthUser(
        id=record.id,
        username=record.username,
        role=record.role,
        createdAt=record.created_at,
    )


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _unauthorized_error() -> AppError:
    return AppError(
        401,
        "AUTH_UNAUTHORIZED",
        "Authentication is required",
    )


def _forbidden_error() -> AppError:
    return AppError(
        403,
        "AUTH_FORBIDDEN",
        "The current account does not have permission for this action",
    )
