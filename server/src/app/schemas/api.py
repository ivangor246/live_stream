from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ReadinessResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ok"]


class ErrorPayload(BaseModel):
    code: str
    message: str


class ApiErrorResponse(BaseModel):
    error: ErrorPayload
