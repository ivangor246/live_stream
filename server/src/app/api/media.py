from fastapi import APIRouter, status

from app.schemas.media import MediaAuthRequest
from app.services.media_auth import MediaAuthService


def create_media_router(media_auth_service: MediaAuthService) -> APIRouter:
    router = APIRouter(prefix="/media")

    @router.post("/auth", status_code=status.HTTP_204_NO_CONTENT)
    async def authenticate_media(request: MediaAuthRequest) -> None:
        await media_auth_service.authorize(request)

    return router
