import type { Stream } from "../../../shared/stream.js";
import { AppError } from "../errors/AppError.js";
import type { StreamsRepository } from "../repositories/streamsRepository.js";

export class StreamsService {
  constructor(private readonly streamsRepository: StreamsRepository) {}

  getStreams(): Stream[] {
    return this.streamsRepository.findAll();
  }

  getStream(streamId: string): Stream {
    const stream = this.streamsRepository.findById(streamId);

    if (!stream) {
      throw new AppError(404, "STREAM_NOT_FOUND", "Stream was not found");
    }

    return stream;
  }

  createStream(title: string): Stream {
    return this.streamsRepository.create(title);
  }

  startStream(streamId: string): Stream {
    const stream = this.getStream(streamId);

    if (stream.status === "live") {
      throw new AppError(409, "STREAM_ALREADY_LIVE", "Stream is already live");
    }

    if (stream.status === "finished") {
      throw new AppError(
        409,
        "STREAM_ALREADY_FINISHED",
        "Finished stream cannot be started",
      );
    }

    const updatedStream: Stream = {
      ...stream,
      status: "live",
      startedAt: new Date().toISOString(),
    };

    return this.streamsRepository.update(updatedStream);
  }

  finishStream(streamId: string): Stream {
    const stream = this.getStream(streamId);

    if (stream.status === "scheduled") {
      throw new AppError(
        409,
        "STREAM_NOT_LIVE",
        "Scheduled stream cannot be finished",
      );
    }

    if (stream.status === "finished") {
      throw new AppError(
        409,
        "STREAM_ALREADY_FINISHED",
        "Stream is already finished",
      );
    }

    const updatedStream: Stream = {
      ...stream,
      status: "finished",
      finishedAt: new Date().toISOString(),
    };

    return this.streamsRepository.update(updatedStream);
  }
}
