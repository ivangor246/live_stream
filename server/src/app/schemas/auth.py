from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

UserRole = Literal["admin", "operator", "viewer"]


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


class AuthSetupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=12, max_length=256)


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)
