from fastapi import Request, Response, WebSocket
from starlette.requests import HTTPConnection

from app.core.errors import AppError
from app.schemas.stream import CreateStreamRequest, Stream
from app.services.auth import AuthService
from app.services.guest_sessions import GuestSessionService
from app.services.streams import StreamsService


class StreamAccessService:
    def __init__(
        self,
        streams_service: StreamsService,
        auth_service: AuthService,
        guest_sessions: GuestSessionService,
    ) -> None:
        self._streams_service = streams_service
        self._auth_service = auth_service
        self._guest_sessions = guest_sessions

    async def get_streams(self, request: Request) -> list[Stream]:
        is_operator = await self._is_operator(request)
        owned_stream_ids = await self._get_guest_owned_stream_ids(request)
        streams = await self._streams_service.get_streams()
        return [
            self._with_management_access(stream, is_operator or stream.id in owned_stream_ids)
            for stream in streams
        ]

    async def get_stream(self, stream_id: str, request: Request) -> Stream:
        stream = await self._streams_service.get_stream(stream_id)
        return self._with_management_access(
            stream,
            await self._can_manage_stream(stream, request),
        )

    async def create_stream(
        self,
        body: CreateStreamRequest,
        request: Request,
        response: Response,
    ) -> Stream:
        is_operator = await self._is_operator(request)
        guest_owner_token_hash = (
            None
            if is_operator
            else self._guest_sessions.get_or_create_token_hash(request, response)
        )
        stream = await self._streams_service.create_stream(
            body.title,
            body.is_private,
            body.scheduled_at,
            guest_owner_token_hash,
        )
        return self._with_management_access(stream, True)

    async def require_stream_management(self, stream_id: str, request: Request) -> Stream:
        stream = await self._streams_service.get_stream(stream_id)
        if not await self._can_manage_stream(stream, request):
            raise _forbidden_error()

        return self._with_management_access(stream, True)

    async def require_stream_viewing(self, stream_id: str, request: Request) -> Stream:
        stream = await self._streams_service.get_stream(stream_id)
        if stream.is_private and not await self._can_view_private_stream(stream, request):
            raise _forbidden_error()

        return self._with_management_access(
            stream,
            await self._can_manage_stream(stream, request),
        )

    async def can_join_stream(self, stream_id: str, websocket: WebSocket) -> bool:
        stream = await self._streams_service.get_stream(stream_id)
        return not stream.is_private or await self._can_view_private_stream(stream, websocket)

    async def _can_view_private_stream(
        self,
        stream: Stream,
        connection: HTTPConnection,
    ) -> bool:
        if await self._auth_service.get_optional_user(connection):
            return True

        return await self._is_guest_owner(stream, connection)

    async def _can_manage_stream(
        self,
        stream: Stream,
        connection: HTTPConnection,
    ) -> bool:
        return await self._is_operator(connection) or await self._is_guest_owner(
            stream,
            connection,
        )

    async def _is_operator(self, connection: HTTPConnection) -> bool:
        user = await self._auth_service.get_optional_user(connection)
        return user is not None and user.role in {"admin", "operator"}

    async def _is_guest_owner(self, stream: Stream, connection: HTTPConnection) -> bool:
        token_hash = self._guest_sessions.get_token_hash(connection)
        if token_hash is None:
            return False

        return stream.id in await self._streams_service.get_guest_owned_stream_ids(token_hash)

    async def _get_guest_owned_stream_ids(self, connection: HTTPConnection) -> set[str]:
        return await self._streams_service.get_guest_owned_stream_ids(
            self._guest_sessions.get_token_hash(connection),
        )

    @staticmethod
    def _with_management_access(stream: Stream, can_manage: bool) -> Stream:
        return stream.model_copy(update={"can_manage": can_manage})


def _forbidden_error() -> AppError:
    return AppError(
        403,
        "AUTH_FORBIDDEN",
        "This guest session does not have permission for this stream",
    )
