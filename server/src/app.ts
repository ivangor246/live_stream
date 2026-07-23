import cors from "cors";
import express, { type Express } from "express";

import type { StreamsController } from "./controllers/streamsController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createStreamsRouter } from "./routes/streamsRoutes.js";

export function createApp(streamsController: StreamsController): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/streams", createStreamsRouter(streamsController));

  app.use(errorHandler);

  return app;
}
