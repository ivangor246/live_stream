import WebSocket, { type RawData } from "ws";
import z from "zod";

import type {
  ClientWebSocketMessage,
  ServerWebSocketMessage,
} from "../../../shared/websocket.js";

const reactionTypeSchema = z.enum(["like", "fire", "clap"]);

const clientWebSocketMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("viewer:join"),
      payload: z
        .object({
          streamId: z.string().min(1),
          viewerId: z.string().min(1),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("reaction:send"),
      payload: z
        .object({
          streamId: z.string().min(1),
          viewerId: z.string().min(1),
          reaction: reactionTypeSchema,
        })
        .strict(),
    })
    .strict(),
]);

function sendMessage(socket: WebSocket, message: ServerWebSocketMessage): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}

function sendError(socket: WebSocket, code: string, message: string): void {
  sendMessage(socket, {
    type: "error",
    payload: {
      code,
      message,
    },
  });
}

export function handleWebSocketMessage(socket: WebSocket, data: RawData): void {
  let parsedMessage: unknown;

  try {
    parsedMessage = JSON.parse(data.toString());
  } catch {
    sendError(socket, "INVALID_JSON", "Message must contain valid JSON");

    return;
  }

  const parseResult = clientWebSocketMessageSchema.safeParse(parsedMessage);

  if (!parseResult.success) {
    sendError(socket, "INVALID_MESSAGE", "Message has an invalid structure");
    return;
  }

  const message: ClientWebSocketMessage = parseResult.data;

  switch (message.type) {
    case "viewer:join":
      console.log(
        `Viewer ${message.payload.viewerId} requested stream ${message.payload.streamId}`,
      );
      break;

    case "reaction:send":
      console.log(
        `Viewer ${message.payload.viewerId} sent ${message.payload.reaction}`,
      );
      break;
  }
}
