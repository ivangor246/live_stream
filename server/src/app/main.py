import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import create_api_router
from app.api.websocket import register_websocket_route
from app.core.config import settings
from app.core.handlers import register_exception_handlers
from app.database.session import close_database, create_database
from app.repositories.postgres import PostgresStreamsRepository
from app.services.media import MediaConnectionService
from app.services.streams import StreamsService
from app.services.websocket import WebSocketManager

logging.basicConfig(level=settings.log_level)


def create_app() -> FastAPI:
    database_engine, session_factory = create_database(
        settings.database_url,
        echo=settings.database_echo,
    )
    streams_repository = PostgresStreamsRepository(session_factory)
    streams_service = StreamsService(streams_repository)
    media_connection_service = MediaConnectionService(
        rtmp_url=settings.media_rtmp_url,
        hls_url=settings.media_hls_url,
        webrtc_url=settings.media_webrtc_url,
    )
    websocket_manager = WebSocketManager(streams_service)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        await streams_repository.reset_viewer_counts()
        yield
        await websocket_manager.close()
        await close_database(database_engine)

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
    application.include_router(
        create_api_router(
            streams_service,
            database_engine,
            media_connection_service,
        ),
    )
    register_websocket_route(application, websocket_manager)

    return application


app = create_app()
