from fastapi import FastAPI, WebSocket

from app.core.errors import AppError
from app.services.auth import AuthService
from app.services.websocket import WebSocketManager


def register_websocket_route(
    application: FastAPI,
    manager: WebSocketManager,
    auth_service: AuthService,
) -> None:
    @application.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        try:
            await auth_service.require_websocket_user(websocket)
        except AppError:
            await websocket.close(code=1008)
            return

        await manager.handle(websocket)
