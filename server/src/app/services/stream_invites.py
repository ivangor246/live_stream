import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.core.errors import AppError
from app.repositories.stream_invites import PostgresStreamViewerInvitesRepository
from app.schemas.invitation import (
    CreatedStreamViewerInvitation,
    StreamViewerInvitation,
    ViewerInvitationPlayback,
)
from app.services.media import MediaConnectionService, MediaStatusService
from app.services.streams import StreamsService


class StreamViewerInvitationService:
    def __init__(
        self,
        repository: PostgresStreamViewerInvitesRepository,
        streams_service: StreamsService,
        media_connection_service: MediaConnectionService,
        media_status_service: MediaStatusService,
        ttl_hours: int,
    ) -> None:
        self._repository = repository
        self._streams_service = streams_service
        self._media_connection_service = media_connection_service
        self._media_status_service = media_status_service
        self._ttl = timedelta(hours=ttl_hours)

    async def get_invitations(self, stream_id: str) -> list[StreamViewerInvitation]:
        await self._get_private_stream(stream_id)
        invitations = await self._repository.find_active_for_stream(
            stream_id,
            _utc_now(),
        )
        return [_to_invitation(invitation) for invitation in invitations]

    async def create_invitation(
        self,
        stream_id: str,
    ) -> CreatedStreamViewerInvitation:
        await self._get_private_stream(stream_id)
        token = secrets.token_urlsafe(32)
        created_at = _utc_now()
        invitation = await self._repository.create(
            stream_id=stream_id,
            token_hash=_hash_token(token),
            created_at=created_at,
            expires_at=created_at + self._ttl,
        )
        return CreatedStreamViewerInvitation(
            id=invitation.id,
            streamId=invitation.stream_id,
            createdAt=invitation.created_at,
            expiresAt=invitation.expires_at,
            token=token,
        )

    async def delete_invitation(self, stream_id: str, invitation_id: str) -> None:
        await self._get_private_stream(stream_id)
        if not await self._repository.delete(invitation_id, stream_id):
            raise AppError(
                404,
                "STREAM_INVITATION_NOT_FOUND",
                "Viewer invitation was not found",
            )

    async def get_playback(self, token: str) -> ViewerInvitationPlayback:
        invitation = await self._repository.find_active(_hash_token(token), _utc_now())
        if invitation is None:
            raise _invalid_invitation_error()

        stream = await self._get_private_stream(invitation.stream_id)
        stream_key = await self._streams_service.get_stream_key(stream.id)
        path_status = await self._media_status_service.get_path_status(stream_key)
        playback = self._media_connection_service.get_playback(
            stream.id,
            stream_key,
            path_status,
        )
        return ViewerInvitationPlayback(stream=stream, playback=playback)

    async def _get_private_stream(self, stream_id: str):
        stream = await self._streams_service.get_stream(stream_id)
        if not stream.is_private:
            raise AppError(
                409,
                "STREAM_NOT_PRIVATE",
                "Viewer invitations are only available for private streams",
            )

        return stream


def _to_invitation(record) -> StreamViewerInvitation:
    return StreamViewerInvitation(
        id=record.id,
        streamId=record.stream_id,
        createdAt=record.created_at,
        expiresAt=record.expires_at,
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _invalid_invitation_error() -> AppError:
    return AppError(
        404,
        "STREAM_INVITATION_INVALID",
        "Viewer invitation is invalid or expired",
    )
