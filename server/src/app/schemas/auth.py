from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

UserRole = Literal["admin", "operator", "viewer"]
InviteRole = Literal["operator", "viewer"]


class AuthUser(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    username: str
    role: UserRole
    created_at: datetime = Field(alias="createdAt")


class AuthStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    setup_required: bool = Field(alias="setupRequired")
    authenticated: bool
    user: AuthUser | None


class AuthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: AuthUser


class ManagedUser(AuthUser):
    is_active: bool = Field(alias="isActive")


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    is_active: bool | None = Field(default=None, alias="isActive")
    role: UserRole | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "UpdateUserRequest":
        if self.is_active is None and self.role is None:
            raise ValueError("At least one account field must be provided")

        return self


class AuthSetupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=12, max_length=256)


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class CreateInvitationRequest(BaseModel):
    role: InviteRole


class Invitation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    role: InviteRole
    created_at: datetime = Field(alias="createdAt")
    expires_at: datetime = Field(alias="expiresAt")


class CreatedInvitation(Invitation):
    token: str


class InvitationAcceptRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=12, max_length=256)
