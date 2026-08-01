import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import create_api_router
from app.api.websocket import register_websocket_route
from app.core.config import settings
from app.core.handlers import register_exception_handlers
from app.repositories.in_memory import InMemoryStreamsRepository
from app.services.streams import StreamsService
from app.services.websocket import WebSocketManager

logging.basicConfig(level=settings.log_level)


def create_app() -> FastAPI:
    streams_repository = InMemoryStreamsRepository()
    streams_service = StreamsService(streams_repository)
    websocket_manager = WebSocketManager(streams_service)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        await websocket_manager.close()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)
    application.include_router(create_api_router(streams_service))
    register_websocket_route(application, websocket_manager)

    return application


app = create_app()
