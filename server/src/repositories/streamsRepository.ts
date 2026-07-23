import { randomUUID } from "node:crypto";

import type { Stream } from "../../../shared/stream.js";

export interface StreamsRepository {
  findAll(): Stream[];
  findById(id: string): Stream | undefined;
  create(title: string): Stream;
  update(stream: Stream): Stream;
}

export class InMemoryStreamsRepository implements StreamsRepository {
  private readonly streams = new Map<string, Stream>();

  findAll(): Stream[] {
    return Array.from(this.streams.values(), (stream) => ({ ...stream }));
  }

  findById(id: string): Stream | undefined {
    const stream = this.streams.get(id);

    return stream ? { ...stream } : undefined;
  }

  create(title: string): Stream {
    const stream: Stream = {
      id: randomUUID(),
      title,
      status: "scheduled",
      viewerCount: 0,
      reactionCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
    };

    this.streams.set(stream.id, stream);

    return { ...stream };
  }

  update(stream: Stream): Stream {
    const savedStream = { ...stream };

    this.streams.set(savedStream.id, savedStream);

    return { ...savedStream };
  }
}
