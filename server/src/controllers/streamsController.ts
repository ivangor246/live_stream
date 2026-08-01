import type { Request, Response } from "express";
import { z } from "zod";

import type { CreateStreamRequest } from "../contracts/api.js";
import { AppError } from "../errors/AppError.js";
import type { StreamsService } from "../services/streamsService.js";
import { title } from "node:process";

const createStreamSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must contain at least 3 characters")
      .max(100, "Title must contain at most 100 characters"),
  })
  .strict();

export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  getStreams = (_request: Request, response: Response): void => {
    const streams = this.streamsService.getStreams();

    response.json(streams);
  };

  getStream = (
    request: Request<{ streamId: string }>,
    response: Response,
  ): void => {
    const stream = this.streamsService.getStream(request.params.streamId);

    response.json(stream);
  };

  createStream = (request: Request, response: Response): void => {
    const requestBody: unknown = request.body;
    const parseResult = createStreamSchema.safeParse(requestBody);

    if (!parseResult.success) {
      const message =
        parseResult.error.issues[0]?.message ?? "Invalid request body";

      throw new AppError(400, "VALIDATION_ERROR", message);
    }

    const createStreamRequest: CreateStreamRequest = parseResult.data;

    const stream = this.streamsService.createStream(createStreamRequest.title);

    response.status(201).json(stream);
  };

  startStream = (
    request: Request<{ streamId: string }>,
    response: Response,
  ): void => {
    const stream = this.streamsService.startStream(request.params.streamId);

    response.json(stream);
  };

  finishStream = (
    request: Request<{ streamId: string }>,
    response: Response,
  ): void => {
    const stream = this.streamsService.finishStream(request.params.streamId);

    response.json(stream);
  };
}
