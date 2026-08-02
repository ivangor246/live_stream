from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ReadinessResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ok"]


class ServiceStatus(BaseModel):
    status: Literal["ok", "unavailable"]


class SystemStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Literal["ready", "degraded"]
    backend: ServiceStatus
    database: ServiceStatus
    media: ServiceStatus
    checked_at: datetime = Field(alias="checkedAt")


class ErrorPayload(BaseModel):
    code: str
    message: str


class ApiErrorResponse(BaseModel):
    error: ErrorPayload
