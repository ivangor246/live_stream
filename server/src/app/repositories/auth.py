from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuthSessionRecord, UserRecord

SessionFactory = Callable[[], AsyncSession]


class PostgresAuthRepository:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    async def has_users(self) -> bool:
        query = select(func.count()).select_from(UserRecord)

        async with self._session_factory() as session:
            return (await session.scalar(query) or 0) > 0

    async def find_user_by_username(self, username: str) -> UserRecord | None:
        query = select(UserRecord).where(UserRecord.username == username)

        async with self._session_factory() as session:
            return await session.scalar(query)

    async def create_user(
        self,
        username: str,
        password_hash: str,
        password_salt: str,
        created_at: datetime,
    ) -> UserRecord:
        record = UserRecord(
            id=str(uuid4()),
            username=username,
            password_hash=password_hash,
            password_salt=password_salt,
            role="admin",
            created_at=created_at,
        )

        async with self._session_factory() as session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record

    async def find_user_by_session(
        self,
        session_id: str,
        current_time: datetime,
    ) -> UserRecord | None:
        query = (
            select(UserRecord)
            .join(AuthSessionRecord, AuthSessionRecord.user_id == UserRecord.id)
            .where(
                AuthSessionRecord.id == session_id,
                AuthSessionRecord.expires_at > current_time,
            )
        )

        async with self._session_factory() as session:
            return await session.scalar(query)

    async def create_session(
        self,
        session_id: str,
        user_id: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> None:
        record = AuthSessionRecord(
            id=session_id,
            user_id=user_id,
            created_at=created_at,
            expires_at=expires_at,
        )

        async with self._session_factory() as session:
            session.add(record)
            await session.commit()

    async def delete_session(self, session_id: str) -> None:
        async with self._session_factory() as session:
            record = await session.get(AuthSessionRecord, session_id)

            if record is not None:
                await session.delete(record)
                await session.commit()
