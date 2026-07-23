import { createServer } from "node:http";

import { createApp } from "./app.js";
import { StreamsController } from "./controllers/streamsController.js";
import { InMemoryStreamsRepository } from "./repositories/streamsRepository.js";
import { StreamsService } from "./services/streamsService.js";
import { createWebSocketServer } from "./websocket/websocketServer.js";

const PORT = Number(process.env.PORT ?? 3000);

const streamsRepository = new InMemoryStreamsRepository();
const streamsService = new StreamsService(streamsRepository);
const streamsController = new StreamsController(streamsService);

const app = createApp(streamsController);
const httpServer = createServer(app);

const webSocketServer = createWebSocketServer(httpServer, streamsService);

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`Received ${signal}. Shutting down...`);

  const forceShutdownTimeout = setTimeout(() => {
    console.error("Graceful shutdown timed out");

    for (const client of webSocketServer.clients) {
      client.terminate();
    }

    process.exit(1);
  }, 5_000);

  forceShutdownTimeout.unref();

  const httpServerClosed = new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const webSocketServerClosed = new Promise<void>((resolve, reject) => {
    webSocketServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  for (const client of webSocketServer.clients) {
    client.close(1001, "Server is shutting down");
  }

  try {
    await Promise.all([httpServerClosed, webSocketServerClosed]);

    console.log("Server stopped");
    process.exitCode = 0;
  } finally {
    clearTimeout(forceShutdownTimeout);
  }
}

function handleShutdownSignal(signal: NodeJS.Signals): void {
  void shutdown(signal).catch((error: unknown) => {
    console.error("Failed to shut down gracefully:", error);
    process.exit(1);
  });
}

process.on("SIGINT", () => {
  handleShutdownSignal("SIGINT");
});

process.on("SIGTERM", () => {
  handleShutdownSignal("SIGTERM");
});
