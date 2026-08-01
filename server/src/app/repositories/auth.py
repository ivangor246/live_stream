from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuthSessionRecord, UserInviteRecord, UserRecord

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

    async def create_invitation(
        self,
        token_hash: str,
        role: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> UserInviteRecord:
        record = UserInviteRecord(
            id=str(uuid4()),
            token_hash=token_hash,
            role=role,
            created_at=created_at,
            expires_at=expires_at,
            accepted_at=None,
        )

        async with self._session_factory() as session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record

    async def find_active_invitation(
        self,
        token_hash: str,
        current_time: datetime,
    ) -> UserInviteRecord | None:
        query = select(UserInviteRecord).where(
            UserInviteRecord.token_hash == token_hash,
            UserInviteRecord.accepted_at.is_(None),
            UserInviteRecord.expires_at > current_time,
        )

        async with self._session_factory() as session:
            return await session.scalar(query)

    async def find_active_invitations(
        self,
        current_time: datetime,
    ) -> list[UserInviteRecord]:
        query = (
            select(UserInviteRecord)
            .where(
                UserInviteRecord.accepted_at.is_(None),
                UserInviteRecord.expires_at > current_time,
            )
            .order_by(UserInviteRecord.created_at.desc())
        )

        async with self._session_factory() as session:
            return list((await session.scalars(query)).all())

    async def accept_invitation(
        self,
        token_hash: str,
        username: str,
        password_hash: str,
        password_salt: str,
        accepted_at: datetime,
    ) -> UserRecord | None:
        query = (
            select(UserInviteRecord)
            .where(
                UserInviteRecord.token_hash == token_hash,
                UserInviteRecord.accepted_at.is_(None),
                UserInviteRecord.expires_at > accepted_at,
            )
            .with_for_update()
        )

        async with self._session_factory() as session:
            invitation = await session.scalar(query)
            if invitation is None:
                return None

            user = UserRecord(
                id=str(uuid4()),
                username=username,
                password_hash=password_hash,
                password_salt=password_salt,
                role=invitation.role,
                created_at=accepted_at,
            )
            invitation.accepted_at = accepted_at
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    async def delete_invitation(self, invitation_id: str) -> bool:
        async with self._session_factory() as session:
            invitation = await session.get(UserInviteRecord, invitation_id)
            if invitation is None or invitation.accepted_at is not None:
                return False

            await session.delete(invitation)
            await session.commit()
            return True
