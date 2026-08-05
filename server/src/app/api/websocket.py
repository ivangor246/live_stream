from fastapi import FastAPI, WebSocket

from app.services.websocket import WebSocketManager


def register_websocket_route(
    application: FastAPI,
    manager: WebSocketManager,
) -> None:
    @application.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await manager.handle(websocket)
