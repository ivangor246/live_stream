import asyncio
from dataclasses import dataclass
from datetime import datetime
from unittest import IsolatedAsyncioTestCase

from starlette.responses import Response

from app.core.errors import AppError
from app.schemas.auth import AuthSetupRequest
from app.services.auth import AuthService


@dataclass
class User:
    id: str
    username: str
    role: str
    created_at: datetime


class InitialAdminRepository:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self.user: User | None = None
        self.sessions: list[str] = []

    async def create_initial_admin(
        self,
        username: str,
        password_hash: str,
        password_salt: str,
        created_at: datetime,
    ) -> User | None:
        _ = password_hash, password_salt
        async with self._lock:
            await asyncio.sleep(0)
            if self.user is not None:
                return None

            self.user = User("user-id", username, "admin", created_at)
            return self.user

    async def create_session(
        self,
        session_id: str,
        user_id: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> None:
        _ = user_id, created_at, expires_at
        self.sessions.append(session_id)


class AuthServiceSetupTests(IsolatedAsyncioTestCase):
    async def test_parallel_setup_creates_exactly_one_admin(self) -> None:
        repository = InitialAdminRepository()
        service = AuthService(
            repository=repository,
            cookie_name="session",
            session_ttl_days=14,
            invite_ttl_hours=168,
            secure_cookie=False,
        )
        request = AuthSetupRequest(username="admin", password="a secure test password")

        results = await asyncio.gather(
            service.setup(request, Response()),
            service.setup(request, Response()),
            return_exceptions=True,
        )

        self.assertIsNotNone(repository.user)
        self.assertEqual(repository.user.username if repository.user else None, "admin")
        self.assertEqual(len(repository.sessions), 1)
        self.assertEqual(sum(isinstance(result, AppError) for result in results), 1)
