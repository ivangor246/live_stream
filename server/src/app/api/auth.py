from fastapi import APIRouter, Depends, Request, Response, status

from app.schemas.auth import (
    AuthLoginRequest,
    AuthResponse,
    AuthSetupRequest,
    AuthStatus,
    AuthUser,
    CreatedInvitation,
    CreateInvitationRequest,
    Invitation,
    InvitationAcceptRequest,
    ManagedUser,
    UpdateUserRequest,
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

    _register_user_routes(router, auth_service)

    @router.get(
        "/invitations",
        response_model=list[Invitation],
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def get_invitations() -> list[Invitation]:
        return await auth_service.get_invitations()

    @router.post(
        "/invitations",
        response_model=CreatedInvitation,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def create_invitation(
        request: CreateInvitationRequest,
    ) -> CreatedInvitation:
        return await auth_service.create_invitation(request)

    @router.delete(
        "/invitations/{invitation_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(auth_service.require_admin)],
    )
    async def delete_invitation(invitation_id: str) -> None:
        await auth_service.delete_invitation(invitation_id)

    @router.get("/invitations/{token}", response_model=Invitation)
    async def get_invitation(token: str) -> Invitation:
        return await auth_service.get_invitation(token)

    @router.post("/invitations/{token}/accept", response_model=AuthResponse)
    async def accept_invitation(
        token: str,
        request: InvitationAcceptRequest,
        response: Response,
    ) -> AuthResponse:
        return await auth_service.accept_invitation(token, request, response)

    return router


def _register_user_routes(router: APIRouter, auth_service: AuthService) -> None:
    @router.get("/users", response_model=list[ManagedUser])
    async def get_users(
        _: AuthUser = Depends(auth_service.require_admin),
    ) -> list[ManagedUser]:
        return await auth_service.get_users()

    @router.patch("/users/{user_id}", response_model=ManagedUser)
    async def update_user(
        user_id: str,
        request: UpdateUserRequest,
        current_user: AuthUser = Depends(auth_service.require_admin),
    ) -> ManagedUser:
        return await auth_service.update_user(user_id, request, current_user)
