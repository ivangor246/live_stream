import asyncio
import json
import logging
from dataclasses import dataclass

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import TypeAdapter, ValidationError

from .errors import AppError
from .models import Stream, StreamStatus
from .schemas import (
    ClientWebSocketMessage,
    ReactionSendMessage,
    ViewerJoinMessage,
)
from .service import StreamsService

logger = logging.getLogger(__name__)
client_message_adapter = TypeAdapter(ClientWebSocketMessage)


@dataclass
class ConnectionContext:
    viewer_id: str | None = None
    stream_id: str | None = None


class WebSocketManager:
    def __init__(self, streams_service: StreamsService) -> None:
        self._streams_service = streams_service
        self._connections: dict[WebSocket, ConnectionContext] = {}
        self._broadcast_tasks: set[asyncio.Task[None]] = set()
        self._unsubscribe = streams_service.subscribe_to_status_updates(
            self._schedule_status_update,
        )

    def _schedule_status_update(self, stream: Stream) -> None:
        try:
            task = asyncio.create_task(
                self.broadcast_to_stream(
                    stream.id,
                    {
                        "type": "stream:status-updated",
                        "payload": {
                            "streamId": stream.id,
                            "status": stream.status.value,
                        },
                    },
                ),
            )
        except RuntimeError:
            return

        self._broadcast_tasks.add(task)
        task.add_done_callback(self._broadcast_tasks.discard)

    async def handle(self, websocket: WebSocket) -> None:
        await websocket.accept()
        context = ConnectionContext()
        self._connections[websocket] = context

        try:
            while True:
                raw_message = await websocket.receive_text()
                await self._handle_message(websocket, raw_message, context)
        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("Unexpected WebSocket connection error")
            await self._send_error(
                websocket,
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred",
            )
        finally:
            await self.disconnect(websocket, context)

    async def _handle_message(
        self,
        websocket: WebSocket,
        raw_message: str,
        context: ConnectionContext,
    ) -> None:
        try:
            parsed_message = json.loads(raw_message)
        except json.JSONDecodeError:
            await self._send_error(
                websocket,
                "INVALID_JSON",
                "Message must contain valid JSON",
            )
            return

        try:
            message = client_message_adapter.validate_python(parsed_message)
        except ValidationError:
            await self._send_error(
                websocket,
                "INVALID_MESSAGE",
                "Message has an invalid structure",
            )
            return

        try:
            if isinstance(message, ViewerJoinMessage):
                await self._handle_viewer_join(websocket, message, context)
            elif isinstance(message, ReactionSendMessage):
                await self._handle_reaction(websocket, message, context)
        except AppError as error:
            await self._send_error(websocket, error.code, error.message)
        except Exception:
            logger.exception("Unexpected WebSocket message error")
            await self._send_error(
                websocket,
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred",
            )

    async def _handle_viewer_join(
        self,
        websocket: WebSocket,
        message: ViewerJoinMessage,
        context: ConnectionContext,
    ) -> None:
        stream_id = message.payload.stream_id
        viewer_id = message.payload.viewer_id
        connection_already_joined = (
            context.stream_id is not None or context.viewer_id is not None
        )
        joined_same_viewer = (
            context.stream_id == stream_id and context.viewer_id == viewer_id
        )

        if connection_already_joined and not joined_same_viewer:
            raise AppError(
                409,
                "CONNECTION_ALREADY_JOINED",
                "Connection has already joined another stream",
            )

        stream = self._streams_service.add_viewer(stream_id, viewer_id)
        context.stream_id = stream_id
        context.viewer_id = viewer_id

        await self.broadcast_to_stream(
            stream_id,
            {
                "type": "stream:viewers-updated",
                "payload": {
                    "streamId": stream_id,
                    "viewerCount": stream.viewer_count,
                },
            },
        )

    async def _handle_reaction(
        self,
        websocket: WebSocket,
        message: ReactionSendMessage,
        context: ConnectionContext,
    ) -> None:
        stream_id = message.payload.stream_id
        viewer_id = message.payload.viewer_id

        if context.stream_id != stream_id or context.viewer_id != viewer_id:
            raise AppError(
                403,
                "CONNECTION_CONTEXT_MISMATCH",
                "Reaction does not match the connected viewer",
            )

        stream = self._streams_service.add_reaction(
            stream_id,
            viewer_id,
            message.payload.reaction,
        )

        await self.broadcast_to_stream(
            stream_id,
            {
                "type": "stream:reaction-received",
                "payload": {
                    "streamId": stream_id,
                    "reaction": message.payload.reaction,
                    "reactionCount": stream.reaction_count,
                },
            },
        )

    async def broadcast_to_stream(
        self,
        stream_id: str,
        message: dict[str, object],
    ) -> None:
        recipients = [
            websocket
            for websocket, context in self._connections.items()
            if context.stream_id == stream_id
        ]
        await asyncio.gather(
            *(self._send_message(websocket, message) for websocket in recipients),
        )

    async def _send_message(
        self,
        websocket: WebSocket,
        message: dict[str, object],
    ) -> None:
        try:
            await websocket.send_json(message)
        except Exception:
            return

    async def _send_error(
        self,
        websocket: WebSocket,
        code: str,
        message: str,
    ) -> None:
        await self._send_message(
            websocket,
            {
                "type": "error",
                "payload": {"code": code, "message": message},
            },
        )

    async def disconnect(
        self,
        websocket: WebSocket,
        context: ConnectionContext,
    ) -> None:
        self._connections.pop(websocket, None)

        if context.stream_id is None or context.viewer_id is None:
            return

        viewer_still_connected = any(
            connection.stream_id == context.stream_id
            and connection.viewer_id == context.viewer_id
            for connection in self._connections.values()
        )

        if viewer_still_connected:
            return

        stream = self._streams_service.remove_viewer(
            context.stream_id,
            context.viewer_id,
        )

        if stream:
            await self.broadcast_to_stream(
                context.stream_id,
                {
                    "type": "stream:viewers-updated",
                    "payload": {
                        "streamId": context.stream_id,
                        "viewerCount": stream.viewer_count,
                    },
                },
            )

    async def close(self) -> None:
        self._unsubscribe()

        for websocket in tuple(self._connections):
            try:
                await websocket.close(code=1001, reason="Server is shutting down")
            except Exception:
                continue

        self._connections.clear()

        for task in tuple(self._broadcast_tasks):
            task.cancel()

        if self._broadcast_tasks:
            await asyncio.gather(*self._broadcast_tasks, return_exceptions=True)
