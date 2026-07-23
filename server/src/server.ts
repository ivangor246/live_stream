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

createWebSocketServer(httpServer, streamsService);

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
