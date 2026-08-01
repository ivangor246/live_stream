from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


ReactionType: TypeAlias = Literal["like", "fire", "clap"]


class ViewerJoinPayload(StrictModel):
    stream_id: str = Field(alias="streamId", min_length=1)
    viewer_id: str = Field(alias="viewerId", min_length=1)


class ReactionSendPayload(StrictModel):
    stream_id: str = Field(alias="streamId", min_length=1)
    viewer_id: str = Field(alias="viewerId", min_length=1)
    reaction: ReactionType


class ViewerJoinMessage(StrictModel):
    type: Literal["viewer:join"]
    payload: ViewerJoinPayload


class ReactionSendMessage(StrictModel):
    type: Literal["reaction:send"]
    payload: ReactionSendPayload


ClientWebSocketMessage: TypeAlias = Annotated[
    ViewerJoinMessage | ReactionSendMessage,
    Field(discriminator="type"),
]
