import logging
import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import create_api_router
from .errors import AppError
from .repository import InMemoryStreamsRepository
from .service import StreamsService
from .websocket import WebSocketManager

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "*")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


def get_validation_message(error: RequestValidationError) -> str:
    first_error = error.errors()[0] if error.errors() else None

    if first_error and first_error.get("type") == "string_too_short":
        return "Title must contain at least 3 characters"

    if first_error and first_error.get("type") == "string_too_long":
        return "Title must contain at most 100 characters"

    return "Request body is invalid"


def create_app() -> FastAPI:
    streams_repository = InMemoryStreamsRepository()
    streams_service = StreamsService(streams_repository)
    websocket_manager = WebSocketManager(streams_service)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        await websocket_manager.close()

    application = FastAPI(
        title="Live Stream Monitor API",
        version="1.0.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(AppError)
    async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": error.code, "message": error.message}},
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": get_validation_message(error),
                },
            },
        )

    @application.exception_handler(Exception)
    async def handle_unexpected_error(
        _request: Request,
        error: Exception,
    ) -> JSONResponse:
        logger.exception("Unexpected HTTP error", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                },
            },
        )

    application.include_router(create_api_router(streams_service))

    @application.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket_manager.handle(websocket)

    return application


app = create_app()
