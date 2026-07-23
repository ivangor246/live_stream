import WebSocket, { type RawData } from "ws";
import z from "zod";

import { AppError } from "../errors/AppError.js";
import type { StreamsService } from "../services/streamsService.js";

import type {
  ClientWebSocketMessage,
  ServerWebSocketMessage,
} from "../../../shared/websocket.js";

export interface ConnectionContext {
  viewerId: string | null;
  streamId: string | null;
}

export type BroadcastToStream = (
  streamId: string,
  message: ServerWebSocketMessage,
) => void;

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

function handleViewerJoin(
  message: Extract<ClientWebSocketMessage, { type: "viewer:join" }>,
  connectionContext: ConnectionContext,
  streamsService: StreamsService,
  broadcastToStream: BroadcastToStream,
): void {
  const { streamId, viewerId } = message.payload;

  const connectionAlreadyJoined =
    connectionContext.streamId !== null || connectionContext.viewerId !== null;

  const joinedSameViewer =
    connectionContext.streamId === streamId &&
    connectionContext.viewerId === viewerId;

  if (connectionAlreadyJoined && !joinedSameViewer) {
    throw new AppError(
      409,
      "CONNECTION_ALREADY_JOINED",
      "Connection has already joined another stream",
    );
  }

  const stream = streamsService.addViewer(streamId, viewerId);

  connectionContext.streamId = streamId;
  connectionContext.viewerId = viewerId;

  broadcastToStream(streamId, {
    type: "stream:viewers-updated",
    payload: {
      streamId,
      viewerCount: stream.viewerCount,
    },
  });
}

function handleReaction(
  message: Extract<ClientWebSocketMessage, { type: "reaction:send" }>,
  connectionContext: ConnectionContext,
  streamsService: StreamsService,
  broadcastToStream: BroadcastToStream,
): void {
  const { streamId, viewerId, reaction } = message.payload;

  const matchesConnection =
    connectionContext.streamId === streamId &&
    connectionContext.viewerId === viewerId;

  if (!matchesConnection) {
    throw new AppError(
      403,
      "CONNECTION_CONTEXT_MISMATCH",
      "Reaction does not match the connected viewer",
    );
  }

  const stream = streamsService.addReaction(streamId, viewerId, reaction);

  broadcastToStream(streamId, {
    type: "stream:reaction-received",
    payload: {
      streamId,
      reaction,
      reactionCount: stream.reactionCount,
    },
  });
}

export function handleWebSocketMessage(
  socket: WebSocket,
  data: RawData,
  connectionContext: ConnectionContext,
  streamsService: StreamsService,
  broadcastToStream: BroadcastToStream,
): void {
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

  try {
    switch (message.type) {
      case "viewer:join":
        handleViewerJoin(
          message,
          connectionContext,
          streamsService,
          broadcastToStream,
        );
        break;

      case "reaction:send":
        handleReaction(
          message,
          connectionContext,
          streamsService,
          broadcastToStream,
        );
        break;
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      sendError(socket, error.code, error.message);
      return;
    }

    console.error("Unexpected WebSocket error:", error);

    sendError(socket, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
  }
}
