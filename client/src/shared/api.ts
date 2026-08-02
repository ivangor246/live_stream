import type {
  Stream,
  StreamViewerInvitation,
} from "./stream.js";

export interface ReadinessResponse {
  status: "ok";
  database: "ok";
}

export type ServiceHealth = "ok" | "unavailable";

export interface SystemStatusResponse {
  status: "ready" | "degraded";
  backend: { status: ServiceHealth };
  database: { status: ServiceHealth };
  media: { status: ServiceHealth };
  checkedAt: string;
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

export interface RecordingSegment {
  startAt: string;
  durationSeconds: number;
}

export type CreateStreamRequest = Pick<Stream, "title" | "isPrivate">;

export type CreateStreamResponse = Stream;

export type GetStreamsResponse = Stream[];

export type GetStreamResponse = Stream;

export type ChangeStreamStatusResponse = Stream;

export type GetStreamRecordingsResponse = RecordingSegment[];

export interface ViewerInvitationPlayback {
  stream: Stream;
  playback: StreamPlayback;
}

export type GetStreamViewerInvitationsResponse = StreamViewerInvitation[];

export type StreamExportFormat = "csv" | "json";

export interface StreamExportDownload {
  blob: Blob;
  filename: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
