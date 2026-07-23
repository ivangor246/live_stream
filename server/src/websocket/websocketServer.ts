import type { Server } from "node:http";
import WebSocket, { WebSocketServer } from "ws";

import type { ServerWebSocketMessage } from "../../../shared/websocket.js";
import type { StreamsService } from "../services/streamsService.js";
import {
  type BroadcastToStream,
  type ConnectionContext,
  handleWebSocketMessage,
} from "./messageHandler.js";

export function createWebSocketServer(
  httpServer: Server,
  streamsService: StreamsService,
): WebSocketServer {
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  const connectionContexts = new Map<WebSocket, ConnectionContext>();

  const broadcastToStream: BroadcastToStream = (
    streamId: string,
    message: ServerWebSocketMessage,
  ): void => {
    const serializedMessage = JSON.stringify(message);

    for (const client of webSocketServer.clients) {
      const context = connectionContexts.get(client);

      if (
        context?.streamId === streamId &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(serializedMessage);
      }
    }
  };

  webSocketServer.on("connection", (socket) => {
    const connectionContext: ConnectionContext = {
      viewerId: null,
      streamId: null,
    };

    connectionContexts.set(socket, connectionContext);

    socket.on("message", (data) => {
      handleWebSocketMessage(
        socket,
        data,
        connectionContext,
        streamsService,
        broadcastToStream,
      );
    });

    socket.on("close", () => {
      connectionContexts.delete(socket);

      const { streamId, viewerId } = connectionContext;

      if (streamId === null || viewerId === null) {
        return;
      }

      const viewerStillConnected = Array.from(connectionContexts.values()).some(
        (context) =>
          context.streamId === streamId && context.viewerId === viewerId,
      );

      if (viewerStillConnected) {
        return;
      }

      const stream = streamsService.removeViewer(streamId, viewerId);

      if (!stream) {
        return;
      }

      broadcastToStream(streamId, {
        type: "stream:viewers-updated",
        payload: {
          streamId,
          viewerCount: stream.viewerCount,
        },
      });
    });
  });

  return webSocketServer;
}
