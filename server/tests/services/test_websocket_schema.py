from unittest import TestCase

from pydantic import TypeAdapter

from app.schemas.websocket import ClientWebSocketMessage


class WebSocketSchemaTests(TestCase):
    def test_dislike_reaction_is_accepted(self) -> None:
        message = TypeAdapter(ClientWebSocketMessage).validate_python(
            {
                "type": "reaction:send",
                "payload": {
                    "streamId": "stream-id",
                    "viewerId": "viewer-id",
                    "reaction": "dislike",
                },
            }
        )

        self.assertEqual(message.payload.reaction, "dislike")
