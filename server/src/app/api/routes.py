from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.background import BackgroundTask
from starlette.responses import Response, StreamingResponse

from app.core.errors import AppError
from app.database.session import check_database_connection
from app.schemas.api import (
    HealthResponse,
    ReadinessResponse,
    ServiceStatus,
    SystemStatusResponse,
)
from app.schemas.export import StreamExportFormat
from app.schemas.invitation import (
    CreatedStreamViewerInvitation,
    StreamViewerInvitation,
    ViewerInvitationPlayback,
)
from app.schemas.media import RecordingSegment, StreamConnection, StreamPlayback
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.auth import AuthService
from app.services.exports import StreamExportService
from app.services.media import (
    MediaConnectionService,
    MediaRecordingService,
    MediaStatusService,
)
from app.services.streams import StreamsService
from app.services.stream_invites import StreamViewerInvitationService
from app.services.stream_access import StreamAccessService
from app.api.auth import create_auth_router


def create_api_router(
    streams_service: StreamsService,
    database_engine: AsyncEngine,
    media_connection_service: MediaConnectionService,
    media_recording_service: MediaRecordingService,
    media_status_service: MediaStatusService,
    stream_export_service: StreamExportService,
    auth_service: AuthService,
    stream_invitation_service: StreamViewerInvitationService,
    stream_access_service: StreamAccessService,
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

    @router.get("/status", response_model=SystemStatusResponse)
    async def system_status() -> SystemStatusResponse:
        try:
            await check_database_connection(database_engine)
        except (SQLAlchemyError, OSError):
            database_status = "unavailable"
        else:
            database_status = "ok"

        media_status = "ok" if await media_status_service.is_available() else "unavailable"
        is_ready = database_status == "ok" and media_status == "ok"

        return SystemStatusResponse(
            status="ready" if is_ready else "degraded",
            backend=ServiceStatus(status="ok"),
            database=ServiceStatus(status=database_status),
            media=ServiceStatus(status=media_status),
            checkedAt=datetime.now(timezone.utc),
        )

    _register_stream_export_route(
        router,
        stream_export_service,
        auth_service,
    )
    _register_stream_read_routes(
        router,
        streams_service,
        media_connection_service,
        media_recording_service,
        media_status_service,
        stream_invitation_service,
        stream_access_service,
    )
    _register_stream_management_routes(
        router,
        streams_service,
        auth_service,
        stream_invitation_service,
        stream_access_service,
    )

    return router


def _register_stream_read_routes(
    router: APIRouter,
    streams_service: StreamsService,
    media_connection_service: MediaConnectionService,
    media_recording_service: MediaRecordingService,
    media_status_service: MediaStatusService,
    stream_invitation_service: StreamViewerInvitationService,
    stream_access_service: StreamAccessService,
) -> None:

    @router.get(
        "/streams",
        response_model=list[Stream],
    )
    async def get_streams(request: Request) -> list[Stream]:
        return await stream_access_service.get_streams(request)

    @router.get(
        "/streams/{stream_id}",
        response_model=Stream,
    )
    async def get_stream(stream_id: str, request: Request) -> Stream:
        return await stream_access_service.get_stream(stream_id, request)

    @router.get(
        "/streams/{stream_id}/connection",
        response_model=StreamConnection,
    )
    async def get_stream_connection(stream_id: str, request: Request) -> StreamConnection:
        await stream_access_service.require_stream_management(stream_id, request)
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
    )
    async def get_stream_playback(stream_id: str, request: Request) -> StreamPlayback:
        await stream_access_service.require_stream_viewing(stream_id, request)
        stream_key = await streams_service.get_stream_key(stream_id)
        path_status = await media_status_service.get_path_status(stream_key)
        return media_connection_service.get_playback(
            stream_id,
            stream_key,
            path_status,
        )

    @router.get(
        "/streams/{stream_id}/recordings",
        response_model=list[RecordingSegment],
    )
    async def get_stream_recordings(stream_id: str, request: Request) -> list[RecordingSegment]:
        await stream_access_service.require_stream_viewing(stream_id, request)
        stream_key = await streams_service.get_stream_key(stream_id)
        return await media_recording_service.get_recordings(stream_key)

    @router.get(
        "/streams/{stream_id}/recordings/playback",
    )
    async def stream_recording(
        stream_id: str,
        request: Request,
        start: str,
        duration: Annotated[float, Query(gt=0)],
    ) -> StreamingResponse:
        await stream_access_service.require_stream_viewing(stream_id, request)
        stream_key = await streams_service.get_stream_key(stream_id)
        return await _create_recording_response(
            media_recording_service,
            stream_key,
            start,
            duration,
            request.headers.get("range"),
        )

    @router.get(
        "/viewer-invitations/{token}",
        response_model=ViewerInvitationPlayback,
    )
    async def get_viewer_invitation_playback(token: str) -> ViewerInvitationPlayback:
        return await stream_invitation_service.get_playback(token)

    @router.get(
        "/viewer-invitations/{token}/recordings",
        response_model=list[RecordingSegment],
    )
    async def get_viewer_invitation_recordings(token: str) -> list[RecordingSegment]:
        return await stream_invitation_service.get_recordings(token)

    @router.get("/viewer-invitations/{token}/recordings/playback")
    async def stream_viewer_invitation_recording(
        token: str,
        request: Request,
        start: str,
        duration: Annotated[float, Query(gt=0)],
    ) -> StreamingResponse:
        stream = await stream_invitation_service.get_stream(token)
        stream_key = await streams_service.get_stream_key(stream.id)
        return await _create_recording_response(
            media_recording_service,
            stream_key,
            start,
            duration,
            request.headers.get("range"),
        )


def _register_stream_export_route(
    router: APIRouter,
    stream_export_service: StreamExportService,
    auth_service: AuthService,
) -> None:
    @router.get(
        "/streams/export",
        dependencies=[Depends(auth_service.require_operator)],
    )
    async def export_streams(
        format: StreamExportFormat = StreamExportFormat.CSV,
    ) -> Response:
        stream_export = await stream_export_service.create_export(format)
        return Response(
            content=stream_export.content,
            media_type=stream_export.media_type,
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{stream_export.filename}"'
                ),
            },
        )

def _register_stream_management_routes(
    router: APIRouter,
    streams_service: StreamsService,
    auth_service: AuthService,
    stream_invitation_service: StreamViewerInvitationService,
    stream_access_service: StreamAccessService,
) -> None:

    @router.post(
        "/streams",
        response_model=Stream,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_stream(
        body: CreateStreamRequest,
        request: Request,
        response: Response,
    ) -> Stream:
        return await stream_access_service.create_stream(
            body,
            request,
            response,
        )

    @router.get(
        "/streams/{stream_id}/viewer-invitations",
        response_model=list[StreamViewerInvitation],
    )
    async def get_stream_viewer_invitations(
        stream_id: str,
        request: Request,
    ) -> list[StreamViewerInvitation]:
        await stream_access_service.require_stream_management(stream_id, request)
        return await stream_invitation_service.get_invitations(stream_id)

    @router.post(
        "/streams/{stream_id}/viewer-invitations",
        response_model=CreatedStreamViewerInvitation,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_stream_viewer_invitation(
        stream_id: str,
        request: Request,
    ) -> CreatedStreamViewerInvitation:
        await stream_access_service.require_stream_management(stream_id, request)
        return await stream_invitation_service.create_invitation(stream_id)

    @router.delete(
        "/streams/{stream_id}/viewer-invitations/{invitation_id}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    async def delete_stream_viewer_invitation(
        stream_id: str,
        invitation_id: str,
        request: Request,
    ) -> None:
        await stream_access_service.require_stream_management(stream_id, request)
        await stream_invitation_service.delete_invitation(stream_id, invitation_id)

    @router.post(
        "/streams/{stream_id}/start",
        response_model=Stream,
    )
    async def start_stream(stream_id: str, request: Request) -> Stream:
        await stream_access_service.require_stream_management(stream_id, request)
        return await streams_service.start_stream(stream_id)

    @router.post(
        "/streams/{stream_id}/finish",
        response_model=Stream,
    )
    async def finish_stream(stream_id: str, request: Request) -> Stream:
        await stream_access_service.require_stream_management(stream_id, request)
        return await streams_service.finish_stream(stream_id)


async def _create_recording_response(
    media_recording_service: MediaRecordingService,
    stream_key: str,
    start: str,
    duration: float,
    byte_range: str | None,
) -> StreamingResponse:
    recording = await media_recording_service.open_recording(
        stream_key,
        start,
        duration,
        byte_range,
    )
    return StreamingResponse(
        recording.iter_bytes(),
        status_code=recording.status_code,
        media_type=recording.content_type,
        headers=recording.headers,
        background=BackgroundTask(recording.close),
    )
