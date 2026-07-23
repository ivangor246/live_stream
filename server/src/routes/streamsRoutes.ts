import { Router } from "express";

import type { StreamsController } from "../controllers/streamsController.js";

export function createStreamsRouter(
  streamsController: StreamsController,
): Router {
  const router = Router();

  router.get("/", streamsController.getStreams);
  router.get("/:streamId", streamsController.getStream);
  router.post("/", streamsController.createStream);
  router.post("/:streamId/start", streamsController.startStream);
  router.post("/:streamId/finish", streamsController.finishStream);

  return router;
}
