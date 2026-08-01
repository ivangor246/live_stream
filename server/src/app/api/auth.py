from fastapi import APIRouter, Request, Response, status

from app.schemas.auth import (
    AuthLoginRequest,
    AuthResponse,
    AuthSetupRequest,
    AuthStatus,
)
from app.services.auth import AuthService


def create_auth_router(auth_service: AuthService) -> APIRouter:
    router = APIRouter(prefix="/auth")

    @router.get("/status", response_model=AuthStatus)
    async def auth_status(request: Request) -> AuthStatus:
        return await auth_service.get_status(request)

    @router.post(
        "/setup",
        response_model=AuthResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def setup_auth(
        request: AuthSetupRequest,
        response: Response,
    ) -> AuthResponse:
        return await auth_service.setup(request, response)

    @router.post("/login", response_model=AuthResponse)
    async def login(
        request: AuthLoginRequest,
        response: Response,
    ) -> AuthResponse:
        return await auth_service.login(request, response)

    @router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
    async def logout(request: Request, response: Response) -> None:
        await auth_service.logout(request, response)

    return router
