import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import create_api_router
from app.api.media import create_media_router
from app.api.websocket import register_websocket_route
from app.core.config import settings
from app.core.handlers import register_exception_handlers
from app.database.session import close_database, create_database
from app.repositories.postgres import PostgresStreamsRepository
from app.repositories.auth import PostgresAuthRepository
from app.repositories.stream_invites import PostgresStreamViewerInvitesRepository
from app.services.auth import AuthService
from app.services.media import (
    MediaConnectionService,
    MediaPathService,
    MediaRecordingService,
    MediaStatusService,
)
from app.services.media_auth import MediaAuthService, MediaTokenService
from app.services.streams import StreamsService
from app.services.stream_invites import StreamViewerInvitationService
from app.services.websocket import WebSocketManager

logging.basicConfig(level=settings.log_level)


def create_app() -> FastAPI:
    database_engine, session_factory = create_database(
        settings.database_url,
        echo=settings.database_echo,
    )
    streams_repository = PostgresStreamsRepository(session_factory)
    auth_repository = PostgresAuthRepository(session_factory)
    stream_invites_repository = PostgresStreamViewerInvitesRepository(session_factory)
    media_path_service = MediaPathService(
        api_url=settings.media_api_url,
        timeout=settings.media_api_timeout,
    )
    media_token_service = MediaTokenService(
        secret=settings.media_auth_secret,
        ttl_seconds=settings.media_auth_token_ttl_seconds,
    )
    streams_service = StreamsService(streams_repository, media_path_service)
    media_auth_service = MediaAuthService(
        streams_repository,
        media_token_service,
    )
    auth_service = AuthService(
        repository=auth_repository,
        cookie_name=settings.auth_cookie_name,
        session_ttl_days=settings.auth_session_ttl_days,
        invite_ttl_hours=settings.auth_invite_ttl_hours,
        secure_cookie=settings.auth_secure_cookie,
    )
    media_connection_service = MediaConnectionService(
        rtmp_url=settings.media_rtmp_url,
        hls_url=settings.media_hls_url,
        webrtc_url=settings.media_webrtc_url,
        token_service=media_token_service,
    )
    media_status_service = MediaStatusService(
        api_url=settings.media_api_url,
        timeout=settings.media_api_timeout,
    )
    media_recording_service = MediaRecordingService(
        api_url=settings.media_playback_api_url,
        timeout=settings.media_api_timeout,
        token_service=media_token_service,
    )
    stream_invitation_service = StreamViewerInvitationService(
        repository=stream_invites_repository,
        streams_service=streams_service,
        media_connection_service=media_connection_service,
        media_recording_service=media_recording_service,
        media_status_service=media_status_service,
        ttl_hours=settings.stream_invite_ttl_hours,
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
            media_recording_service,
            media_status_service,
            auth_service,
            stream_invitation_service,
        ),
    )
    application.include_router(create_media_router(media_auth_service), prefix="/api")
    register_websocket_route(application, websocket_manager, auth_service)

    return application


app = create_app()
