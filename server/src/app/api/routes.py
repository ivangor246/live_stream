from fastapi import APIRouter, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.errors import AppError
from app.database.session import check_database_connection
from app.schemas.api import HealthResponse, ReadinessResponse
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.streams import StreamsService


def create_api_router(
    streams_service: StreamsService,
    database_engine: AsyncEngine,
) -> APIRouter:
    router = APIRouter(prefix="/api")

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

    @router.get("/streams", response_model=list[Stream])
    async def get_streams() -> list[Stream]:
        return await streams_service.get_streams()

    @router.get("/streams/{stream_id}", response_model=Stream)
    async def get_stream(stream_id: str) -> Stream:
        return await streams_service.get_stream(stream_id)

    @router.post(
        "/streams",
        response_model=Stream,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_stream(request: CreateStreamRequest) -> Stream:
        return await streams_service.create_stream(request.title)

    @router.post("/streams/{stream_id}/start", response_model=Stream)
    async def start_stream(stream_id: str) -> Stream:
        return await streams_service.start_stream(stream_id)

    @router.post("/streams/{stream_id}/finish", response_model=Stream)
    async def finish_stream(stream_id: str) -> Stream:
        return await streams_service.finish_stream(stream_id)

    return router
