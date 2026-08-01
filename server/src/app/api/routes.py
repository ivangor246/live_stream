from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.errors import AppError
from app.database.session import check_database_connection
from app.schemas.api import HealthResponse, ReadinessResponse
from app.schemas.invitation import (
    CreatedStreamViewerInvitation,
    StreamViewerInvitation,
    ViewerInvitationPlayback,
)
from app.schemas.media import StreamConnection, StreamPlayback
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.auth import AuthService
from app.services.media import MediaConnectionService, MediaStatusService
from app.services.streams import StreamsService
from app.services.stream_invites import StreamViewerInvitationService
from app.api.auth import create_auth_router


def create_api_router(
    streams_service: StreamsService,
    database_engine: AsyncEngine,
    media_connection_service: MediaConnectionService,
    media_status_service: MediaStatusService,
    auth_service: AuthService,
    stream_invitation_service: StreamViewerInvitationService,
) -> APIRouter:
    router = APIRouter(prefix="/api")
    router.include_router(create_auth_router(auth_service))

    @router.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @router.get("/ready", response_model=ReadinessResponse)
    async def readiness() -> ReadinessResponse:
        try:
            await check_database_connection(database_engine)
        except (SQLAlchemyError, OSError) as error:
            raise AppError(
                503,
                "DATABASE_UNAVAILABLE",
                "The database is unavailable",
            ) from error

        return ReadinessResponse(status="ok", database="ok")

    _register_stream_read_routes(
        router,
        streams_service,
        media_connection_service,
        media_status_service,
        auth_service,
        stream_invitation_service,
    )
    _register_stream_management_routes(
        router,
        streams_service,
        auth_service,
        stream_invitation_service,
    )

    return router


def _register_stream_read_routes(
    router: APIRouter,
    streams_service: StreamsService,
    media_connection_service: MediaConnectionService,
    media_status_service: MediaStatusService,
    auth_service: AuthService,
    stream_invitation_service: StreamViewerInvitationService,
) -> None:

    @router.get(
        "/streams",
        response_model=list[Stream],
        dependencies=[Depends(auth_service.require_user)],
    )
    async def get_streams() -> list[Stream]:
        return await streams_service.get_streams()

    @router.get(
        "/streams/{stream_id}",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_user)],
    )
    async def get_stream(stream_id: str) -> Stream:
        return await streams_service.get_stream(stream_id)

    @router.get(
        "/streams/{stream_id}/connection",
        response_model=StreamConnection,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def get_stream_connection(stream_id: str) -> StreamConnection:
        await streams_service.get_stream(stream_id)
        stream_key = await streams_service.get_stream_key(stream_id)
        path_status = await media_status_service.get_path_status(stream_key)
        return media_connection_service.get_connection(
            stream_id,
            stream_key,
            path_status,
        )

    @router.get(
        "/streams/{stream_id}/playback",
        response_model=StreamPlayback,
        dependencies=[Depends(auth_service.require_user)],
    )
    async def get_stream_playback(stream_id: str) -> StreamPlayback:
        await streams_service.get_stream(stream_id)
        stream_key = await streams_service.get_stream_key(stream_id)
        path_status = await media_status_service.get_path_status(stream_key)
        return media_connection_service.get_playback(
            stream_id,
            stream_key,
            path_status,
        )

    @router.get(
        "/viewer-invitations/{token}",
        response_model=ViewerInvitationPlayback,
    )
    async def get_viewer_invitation_playback(token: str) -> ViewerInvitationPlayback:
        return await stream_invitation_service.get_playback(token)


def _register_stream_management_routes(
    router: APIRouter,
    streams_service: StreamsService,
    auth_service: AuthService,
    stream_invitation_service: StreamViewerInvitationService,
) -> None:

    @router.post(
        "/streams",
        response_model=Stream,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def create_stream(request: CreateStreamRequest) -> Stream:
        return await streams_service.create_stream(request.title, request.is_private)

    @router.get(
        "/streams/{stream_id}/viewer-invitations",
        response_model=list[StreamViewerInvitation],
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def get_stream_viewer_invitations(
        stream_id: str,
    ) -> list[StreamViewerInvitation]:
        return await stream_invitation_service.get_invitations(stream_id)

    @router.post(
        "/streams/{stream_id}/viewer-invitations",
        response_model=CreatedStreamViewerInvitation,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def create_stream_viewer_invitation(
        stream_id: str,
    ) -> CreatedStreamViewerInvitation:
        return await stream_invitation_service.create_invitation(stream_id)

    @router.delete(
        "/streams/{stream_id}/viewer-invitations/{invitation_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def delete_stream_viewer_invitation(
        stream_id: str,
        invitation_id: str,
    ) -> None:
        await stream_invitation_service.delete_invitation(stream_id, invitation_id)

    @router.post(
        "/streams/{stream_id}/start",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def start_stream(stream_id: str) -> Stream:
        return await streams_service.start_stream(stream_id)

    @router.post(
        "/streams/{stream_id}/finish",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def finish_stream(stream_id: str) -> Stream:
        return await streams_service.finish_stream(stream_id)
