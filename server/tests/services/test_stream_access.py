import hashlib
from datetime import datetime, timezone
from unittest import IsolatedAsyncioTestCase

from fastapi import Response
from starlette.requests import Request

from app.core.errors import AppError
from app.schemas.stream import CreateStreamRequest, Stream, StreamStatus
from app.services.guest_sessions import GuestSessionService
from app.services.stream_access import StreamAccessService


class StubAuthService:
    async def get_optional_user(self, _connection):
        return None


class StubStreamsService:
    def __init__(self, stream: Stream) -> None:
        self.stream = stream
        self.created_owner_token_hash: str | None = None

    async def get_streams(self) -> list[Stream]:
        return [self.stream]

    async def get_stream(self, stream_id: str) -> Stream:
        if stream_id != self.stream.id:
            raise AppError(404, "STREAM_NOT_FOUND", "Stream was not found")

        return self.stream

    async def get_guest_owned_stream_ids(self, token_hash: str | None) -> set[str]:
        if token_hash == _hash_token("owner-token"):
            return {self.stream.id}

        return set()

    async def create_stream(
        self,
        title: str,
        is_private: bool,
        scheduled_at,
        guest_owner_token_hash: str | None,
    ) -> Stream:
        self.created_owner_token_hash = guest_owner_token_hash
        return self.stream.model_copy(
            update={
                "title": title,
                "is_private": is_private,
                "scheduled_at": scheduled_at,
            },
        )


def create_request(cookie: str | None = None) -> Request:
    headers = [(b"cookie", cookie.encode("ascii"))] if cookie else []
    return Request({"type": "http", "headers": headers})


def create_stream(is_private: bool = False) -> Stream:
    now = datetime.now(timezone.utc)
    return Stream(
        id="stream-id",
        title="Test stream",
        isPrivate=is_private,
        status=StreamStatus.SCHEDULED,
        viewerCount=0,
        reactionCount=0,
        createdAt=now,
        scheduledAt=None,
        startedAt=None,
        finishedAt=None,
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class StreamAccessServiceTests(IsolatedAsyncioTestCase):
    def create_service(self, stream: Stream) -> tuple[StreamAccessService, StubStreamsService]:
        streams_service = StubStreamsService(stream)
        service = StreamAccessService(
            streams_service=streams_service,
            auth_service=StubAuthService(),
            guest_sessions=GuestSessionService(
                cookie_name="guest",
                ttl_days=90,
                secure_cookie=False,
            ),
        )
        return service, streams_service

    async def test_guest_creator_receives_an_owner_cookie_and_management_access(self) -> None:
        service, streams_service = self.create_service(create_stream())
        response = Response()

        created = await service.create_stream(
            CreateStreamRequest(title="Guest stream", isPrivate=False),
            create_request(),
            response,
        )

        self.assertTrue(created.can_manage)
        self.assertIsNotNone(streams_service.created_owner_token_hash)
        self.assertIn("guest=", response.headers["set-cookie"])
        self.assertIn("HttpOnly", response.headers["set-cookie"])

    async def test_guest_can_only_manage_streams_owned_by_its_cookie(self) -> None:
        service, _ = self.create_service(create_stream())

        owned = await service.require_stream_management(
            "stream-id",
            create_request("guest=owner-token"),
        )
        self.assertTrue(owned.can_manage)

        with self.assertRaises(AppError) as error:
            await service.require_stream_management(
                "stream-id",
                create_request("guest=other-token"),
            )

        self.assertEqual(error.exception.status_code, 403)

    async def test_private_stream_requires_an_account_or_owner_cookie(self) -> None:
        service, _ = self.create_service(create_stream(is_private=True))

        with self.assertRaises(AppError) as error:
            await service.require_stream_viewing("stream-id", create_request())

        self.assertEqual(error.exception.status_code, 403)

        owner_stream = await service.require_stream_viewing(
            "stream-id",
            create_request("guest=owner-token"),
        )
        self.assertTrue(owner_stream.can_manage)
