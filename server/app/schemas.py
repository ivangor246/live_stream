from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from .models import StreamStatus


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ErrorPayload(BaseModel):
    code: str
    message: str


class ApiErrorResponse(BaseModel):
    error: ErrorPayload


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ViewerJoinPayload(StrictModel):
    stream_id: str = Field(alias="streamId", min_length=1)
    viewer_id: str = Field(alias="viewerId", min_length=1)


class ReactionSendPayload(StrictModel):
    stream_id: str = Field(alias="streamId", min_length=1)
    viewer_id: str = Field(alias="viewerId", min_length=1)
    reaction: Literal["like", "fire", "clap"]


class ViewerJoinMessage(StrictModel):
    type: Literal["viewer:join"]
    payload: ViewerJoinPayload


class ReactionSendMessage(StrictModel):
    type: Literal["reaction:send"]
    payload: ReactionSendPayload


ClientWebSocketMessage = Annotated[
    ViewerJoinMessage | ReactionSendMessage,
    Field(discriminator="type"),
]


def status_value(status: StreamStatus) -> str:
    return status.value
