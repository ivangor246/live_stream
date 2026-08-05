import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response, WebSocket
from starlette.requests import HTTPConnection
from sqlalchemy.exc import IntegrityError

from app.core.errors import AppError
from app.repositories.auth import PostgresAuthRepository
from app.schemas.auth import (
    AuthLoginRequest,
    AuthResponse,
    AuthSetupRequest,
    AuthStatus,
    AuthUser,
    ChangePasswordRequest,
    CreatedInvitation,
    CreateInvitationRequest,
    Invitation,
    InvitationAcceptRequest,
    ManagedUser,
    UpdateUserRequest,
)
from app.utils.passwords import hash_password, verify_password


class AuthService:
    def __init__(
        self,
        repository: PostgresAuthRepository,
        cookie_name: str,
        session_ttl_days: int,
        invite_ttl_hours: int,
        secure_cookie: bool,
    ) -> None:
        self._repository = repository
        self._cookie_name = cookie_name
        self._session_ttl = timedelta(days=session_ttl_days)
        self._invite_ttl = timedelta(hours=invite_ttl_hours)
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
        username = _normalize_username(request.username)
        if not username:
            raise AppError(
                400,
                "VALIDATION_ERROR",
                "Username must contain at least one non-space character",
            )

        password_salt, password_hash = hash_password(request.password)
        user = await self._repository.create_initial_admin(
            username=username,
            password_hash=password_hash,
            password_salt=password_salt,
            created_at=_utc_now(),
        )
        if user is None:
            raise AppError(
                409,
                "AUTH_SETUP_COMPLETE",
                "The administrator account is already configured",
            )

        await self._start_session(user.id, response)
        return AuthResponse(user=_to_auth_user(user))

    async def login(
        self,
        request: AuthLoginRequest,
        response: Response,
    ) -> AuthResponse:
        username = _normalize_username(request.username)
        user = await self._repository.find_user_by_username(username)

        if user is None or not user.is_active or not verify_password(
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
            await self._repository.delete_session(_hash_token(token))

        response.delete_cookie(self._cookie_name, path="/")

    async def change_password(
        self,
        request: ChangePasswordRequest,
        response: Response,
        current_user: AuthUser,
    ) -> AuthResponse:
        user = await self._repository.find_user_by_id(current_user.id)
        if user is None or not verify_password(
            request.current_password,
            user.password_salt,
            user.password_hash,
        ):
            raise AppError(
                401,
                "AUTH_INVALID_CURRENT_PASSWORD",
                "The current password is incorrect",
            )

        password_salt, password_hash = hash_password(request.new_password)
        if not await self._repository.update_password(
            user.id,
            password_hash,
            password_salt,
        ):
            raise _unauthorized_error()

        await self._start_session(user.id, response)
        return AuthResponse(user=_to_auth_user(user))

    async def get_invitation(self, token: str) -> Invitation:
        invitation = await self._repository.find_active_invitation(
            _hash_token(token),
            _utc_now(),
        )
        if invitation is None:
            raise _invalid_invitation_error()

        return _to_invitation(invitation)

    async def get_invitations(self) -> list[Invitation]:
        invitations = await self._repository.find_active_invitations(_utc_now())
        return [_to_invitation(invitation) for invitation in invitations]

    async def create_invitation(
        self,
        request: CreateInvitationRequest,
    ) -> CreatedInvitation:
        token = secrets.token_urlsafe(32)
        created_at = _utc_now()
        invitation = await self._repository.create_invitation(
            token_hash=_hash_token(token),
            role=request.role,
            created_at=created_at,
            expires_at=created_at + self._invite_ttl,
        )
        return CreatedInvitation(
            id=invitation.id,
            role=invitation.role,
            createdAt=invitation.created_at,
            expiresAt=invitation.expires_at,
            token=token,
        )

    async def accept_invitation(
        self,
        token: str,
        request: InvitationAcceptRequest,
        response: Response,
    ) -> AuthResponse:
        username = _normalize_username(request.username)
        if not username:
            raise AppError(
                400,
                "VALIDATION_ERROR",
                "Username must contain at least one non-space character",
            )

        if await self._repository.find_user_by_username(username):
            raise _username_taken_error()

        password_salt, password_hash = hash_password(request.password)
        accepted_at = _utc_now()

        try:
            user = await self._repository.accept_invitation(
                token_hash=_hash_token(token),
                username=username,
                password_hash=password_hash,
                password_salt=password_salt,
                accepted_at=accepted_at,
            )
        except IntegrityError as error:
            raise _username_taken_error() from error

        if user is None:
            raise _invalid_invitation_error()

        await self._start_session(user.id, response)
        return AuthResponse(user=_to_auth_user(user))

    async def delete_invitation(self, invitation_id: str) -> None:
        if not await self._repository.delete_invitation(invitation_id):
            raise AppError(404, "INVITATION_NOT_FOUND", "Invitation was not found")

    async def get_users(self) -> list[ManagedUser]:
        users = await self._repository.find_users()
        return [_to_managed_user(user) for user in users]

    async def update_user(
        self,
        user_id: str,
        request: UpdateUserRequest,
        current_user: AuthUser,
    ) -> ManagedUser:
        if user_id == current_user.id and request.is_active is False:
            raise AppError(
                409,
                "AUTH_SELF_DEACTIVATION",
                "Administrators cannot deactivate their own account",
            )

        if user_id == current_user.id and request.role not in {None, "admin"}:
            raise AppError(
                409,
                "AUTH_SELF_ROLE_CHANGE",
                "Administrators cannot reduce their own role",
            )

        user = await self._repository.update_user(
            user_id,
            is_active=request.is_active,
            role=request.role,
        )
        if user is None:
            raise AppError(404, "AUTH_USER_NOT_FOUND", "User was not found")

        return _to_managed_user(user)

    async def delete_user(self, user_id: str, current_user: AuthUser) -> None:
        if user_id == current_user.id:
            raise AppError(
                409,
                "AUTH_SELF_DELETION",
                "Administrators cannot delete their own account",
            )

        user = await self._repository.find_user_by_id(user_id)
        if user is None:
            raise AppError(404, "AUTH_USER_NOT_FOUND", "User was not found")

        if user.is_active:
            raise AppError(
                409,
                "AUTH_USER_ACTIVE",
                "Disable an account before deleting it",
            )

        if not await self._repository.delete_user(user_id):
            raise AppError(404, "AUTH_USER_NOT_FOUND", "User was not found")

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
        user = await self.get_optional_user(request)
        if user is None:
            raise _unauthorized_error()

        return user

    async def get_optional_user(self, connection: HTTPConnection) -> AuthUser | None:
        user = await self._get_user_from_token(
            connection.cookies.get(self._cookie_name),
        )
        return _to_auth_user(user) if user else None

    async def require_websocket_user(self, websocket: WebSocket) -> AuthUser:
        user = await self.get_optional_user(websocket)
        if user is None:
            raise _unauthorized_error()

        return user

    async def _start_session(self, user_id: str, response: Response) -> None:
        session_token = secrets.token_urlsafe(32)
        created_at = _utc_now()
        expires_at = created_at + self._session_ttl

        await self._repository.create_session(
            session_id=_hash_token(session_token),
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
            _hash_token(token),
            _utc_now(),
        )


def _to_auth_user(record) -> AuthUser:
    return AuthUser(
        id=record.id,
        username=record.username,
        role=record.role,
        createdAt=record.created_at,
    )


def _to_managed_user(record) -> ManagedUser:
    return ManagedUser(
        id=record.id,
        username=record.username,
        role=record.role,
        isActive=record.is_active,
        createdAt=record.created_at,
    )


def _to_invitation(record) -> Invitation:
    return Invitation(
        id=record.id,
        role=record.role,
        createdAt=record.created_at,
        expiresAt=record.expires_at,
    )


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _hash_token(token: str) -> str:
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


def _invalid_invitation_error() -> AppError:
    return AppError(404, "INVITATION_INVALID", "Invitation is invalid or expired")


def _username_taken_error() -> AppError:
    return AppError(409, "AUTH_USERNAME_TAKEN", "Username is already in use")
