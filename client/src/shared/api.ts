import type { Stream } from "./stream.js";

export interface ReadinessResponse {
  status: "ok";
  database: "ok";
}

export type MediaSourceStatus = "online" | "offline" | "unavailable";

export interface StreamPlayback {
  streamId: string;
  hlsUrl: string;
  webrtcUrl: string;
  sourceStatus: MediaSourceStatus;
  sourceProtocol: string | null;
}

export interface StreamConnection extends StreamPlayback {
  rtmpUrl: string;
  rtmpPublishUrl: string;
  streamKey: string;
}

export type CreateStreamRequest = Pick<Stream, "title">;

export type CreateStreamResponse = Stream;

export type GetStreamsResponse = Stream[];

export type GetStreamResponse = Stream;

export type ChangeStreamStatusResponse = Stream;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
