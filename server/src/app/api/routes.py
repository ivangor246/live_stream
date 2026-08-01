from fastapi import APIRouter, status

from app.schemas.api import HealthResponse
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.streams import StreamsService


def create_api_router(streams_service: StreamsService) -> APIRouter:
    router = APIRouter(prefix="/api")

    @router.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @router.get("/streams", response_model=list[Stream])
    async def get_streams() -> list[Stream]:
        return streams_service.get_streams()

    @router.get("/streams/{stream_id}", response_model=Stream)
    async def get_stream(stream_id: str) -> Stream:
        return streams_service.get_stream(stream_id)

    @router.post(
        "/streams",
        response_model=Stream,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_stream(request: CreateStreamRequest) -> Stream:
        return streams_service.create_stream(request.title)

    @router.post("/streams/{stream_id}/start", response_model=Stream)
    async def start_stream(stream_id: str) -> Stream:
        return streams_service.start_stream(stream_id)

    @router.post("/streams/{stream_id}/finish", response_model=Stream)
    async def finish_stream(stream_id: str) -> Stream:
        return streams_service.finish_stream(stream_id)

    return router
