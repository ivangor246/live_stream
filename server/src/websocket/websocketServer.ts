import type { Server } from "node:http";
import { WebSocketServer } from "ws";

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  webSocketServer.on("connection", (socket) => {
    console.log("Websocket client connected");

    socket.on("close", () => {
      console.log("Websocket client disconnected");
    });
  });

  return webSocketServer;
}
