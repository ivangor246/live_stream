from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.errors import AppError
from app.database.session import check_database_connection
from app.schemas.api import HealthResponse, ReadinessResponse
from app.schemas.media import StreamConnection
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.auth import AuthService
from app.services.media import MediaConnectionService, MediaStatusService
from app.services.streams import StreamsService
from app.api.auth import create_auth_router


def create_api_router(
    streams_service: StreamsService,
    database_engine: AsyncEngine,
    media_connection_service: MediaConnectionService,
    media_status_service: MediaStatusService,
    auth_service: AuthService,
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

    @router.get(
        "/streams",
        response_model=list[Stream],
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def get_streams() -> list[Stream]:
        return await streams_service.get_streams()

    @router.get(
        "/streams/{stream_id}",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def get_stream(stream_id: str) -> Stream:
        return await streams_service.get_stream(stream_id)

    @router.get(
        "/streams/{stream_id}/connection",
        response_model=StreamConnection,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def get_stream_connection(stream_id: str) -> StreamConnection:
        await streams_service.get_stream(stream_id)
        path_status = await media_status_service.get_path_status(stream_id)
        return media_connection_service.get_connection(stream_id, path_status)

    @router.post(
        "/streams",
        response_model=Stream,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def create_stream(request: CreateStreamRequest) -> Stream:
        return await streams_service.create_stream(request.title)

    @router.post(
        "/streams/{stream_id}/start",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def start_stream(stream_id: str) -> Stream:
        return await streams_service.start_stream(stream_id)

    @router.post(
        "/streams/{stream_id}/finish",
        response_model=Stream,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def finish_stream(stream_id: str) -> Stream:
        return await streams_service.finish_stream(stream_id)

    return router
