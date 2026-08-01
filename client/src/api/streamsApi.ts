import type {
  ApiErrorResponse,
  ChangeStreamStatusResponse,
  CreateStreamRequest,
  CreateStreamResponse,
  GetStreamResponse,
  GetStreamsResponse,
  GetStreamViewerInvitationsResponse,
  RecordingSegment,
  ReadinessResponse,
  MediaSourceStatus,
  GetStreamRecordingsResponse,
  StreamConnection,
  StreamPlayback,
  ViewerInvitationPlayback,
} from "../shared/api.js";

import type {
  CreatedStreamViewerInvitation,
  Stream,
  StreamStatus,
  StreamViewerInvitation,
} from "../shared/stream.js";

type ResponseValidator<T> = (value: unknown) => value is T;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStreamStatus(value: unknown): value is StreamStatus {
  return value === "scheduled" || value === "live" || value === "finished";
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isStream(value: unknown): value is Stream {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.isPrivate === "boolean" &&
    isStreamStatus(value.status) &&
    typeof value.viewerCount === "number" &&
    Number.isInteger(value.viewerCount) &&
    value.viewerCount >= 0 &&
    typeof value.reactionCount === "number" &&
    Number.isInteger(value.reactionCount) &&
    value.reactionCount >= 0 &&
    typeof value.createdAt === "string" &&
    isNullableString(value.startedAt) &&
    isNullableString(value.finishedAt)
  );
}

function isStreamViewerInvitation(
  value: unknown,
): value is StreamViewerInvitation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.streamId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isCreatedStreamViewerInvitation(
  value: unknown,
): value is CreatedStreamViewerInvitation {
  if (!isRecord(value) || !isStreamViewerInvitation(value)) {
    return false;
  }

  return typeof value.token === "string";
}

function isStreamViewerInvitations(
  value: unknown,
): value is GetStreamViewerInvitationsResponse {
  return Array.isArray(value) && value.every(isStreamViewerInvitation);
}

function isRecordingSegment(value: unknown): value is RecordingSegment {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.startAt === "string" &&
    typeof value.durationSeconds === "number" &&
    Number.isFinite(value.durationSeconds) &&
    value.durationSeconds > 0
  );
}

function isRecordingSegments(
  value: unknown,
): value is GetStreamRecordingsResponse {
  return Array.isArray(value) && value.every(isRecordingSegment);
}

function isStreams(value: unknown): value is GetStreamsResponse {
  return Array.isArray(value) && value.every(isStream);
}

function isReadinessResponse(value: unknown): value is ReadinessResponse {
  if (!isRecord(value)) {
    return false;
  }

  return value.status === "ok" && value.database === "ok";
}

function isMediaSourceStatus(value: unknown): value is MediaSourceStatus {
  return value === "online" || value === "offline" || value === "unavailable";
}

function isStreamPlayback(value: unknown): value is StreamPlayback {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.streamId === "string" &&
    typeof value.hlsUrl === "string" &&
    typeof value.webrtcUrl === "string" &&
    isMediaSourceStatus(value.sourceStatus) &&
    isNullableString(value.sourceProtocol)
  );
}

function isStreamConnection(value: unknown): value is StreamConnection {
  if (!isRecord(value) || !isStreamPlayback(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.rtmpUrl === "string" &&
    typeof record.rtmpPublishUrl === "string" &&
    typeof record.streamKey === "string"
  );
}

function isViewerInvitationPlayback(
  value: unknown,
): value is ViewerInvitationPlayback {
  if (!isRecord(value)) {
    return false;
  }

  return isStream(value.stream) && isStreamPlayback(value.playback);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

async function request<T>(
  path: string,
  validateResponse: ResponseValidator<T>,
  requestInit: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, requestInit);
  const responseBody: unknown = await response.json();

  if (!response.ok) {
    if (isApiErrorResponse(responseBody)) {
      throw new ApiError(
        response.status,
        responseBody.error.code,
        responseBody.error.message,
      );
    }

    throw new ApiError(
      response.status,
      "UNKNOWN_API_ERROR",
      `Request failed with status ${response.status}`,
    );
  }

  if (!validateResponse(responseBody)) {
    throw new ApiError(
      response.status,
      "INVALID_API_RESPONSE",
      "Server returned an invalid response",
    );
  }

  return responseBody;
}

function createSignalInit(signal?: AbortSignal): RequestInit {
  return signal ? { signal } : {};
}

export function getStreams(signal?: AbortSignal): Promise<GetStreamsResponse> {
  return request<GetStreamsResponse>(
    "/api/streams",
    isStreams,
    createSignalInit(signal),
  );
}

export function getReadiness(
  signal?: AbortSignal,
): Promise<ReadinessResponse> {
  return request<ReadinessResponse>(
    "/api/ready",
    isReadinessResponse,
    createSignalInit(signal),
  );
}

export function getStream(
  streamId: string,
  signal?: AbortSignal,
): Promise<GetStreamResponse> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<GetStreamResponse>(
    `/api/streams/${encodedStreamId}`,
    isStream,
    createSignalInit(signal),
  );
}

export function getStreamConnection(
  streamId: string,
  signal?: AbortSignal,
): Promise<StreamConnection> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<StreamConnection>(
    `/api/streams/${encodedStreamId}/connection`,
    isStreamConnection,
    createSignalInit(signal),
  );
}

export function getStreamPlayback(
  streamId: string,
  signal?: AbortSignal,
): Promise<StreamPlayback> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<StreamPlayback>(
    `/api/streams/${encodedStreamId}/playback`,
    isStreamPlayback,
    createSignalInit(signal),
  );
}

export function getStreamRecordings(
  streamId: string,
  signal?: AbortSignal,
): Promise<GetStreamRecordingsResponse> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<GetStreamRecordingsResponse>(
    `/api/streams/${encodedStreamId}/recordings`,
    isRecordingSegments,
    createSignalInit(signal),
  );
}

export function getViewerInvitationRecordings(
  token: string,
  signal?: AbortSignal,
): Promise<GetStreamRecordingsResponse> {
  const encodedToken = encodeURIComponent(token);

  return request<GetStreamRecordingsResponse>(
    `/api/viewer-invitations/${encodedToken}/recordings`,
    isRecordingSegments,
    createSignalInit(signal),
  );
}

export function getStreamRecordingPlaybackUrl(
  streamId: string,
  recording: RecordingSegment,
): string {
  const encodedStreamId = encodeURIComponent(streamId);
  const query = new URLSearchParams({
    start: recording.startAt,
    duration: String(recording.durationSeconds),
  });

  return `/api/streams/${encodedStreamId}/recordings/playback?${query}`;
}

export function getViewerInvitationRecordingPlaybackUrl(
  token: string,
  recording: RecordingSegment,
): string {
  const encodedToken = encodeURIComponent(token);
  const query = new URLSearchParams({
    start: recording.startAt,
    duration: String(recording.durationSeconds),
  });

  return `/api/viewer-invitations/${encodedToken}/recordings/playback?${query}`;
}

export function getStreamViewerInvitations(
  streamId: string,
  signal?: AbortSignal,
): Promise<GetStreamViewerInvitationsResponse> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<GetStreamViewerInvitationsResponse>(
    `/api/streams/${encodedStreamId}/viewer-invitations`,
    isStreamViewerInvitations,
    createSignalInit(signal),
  );
}

export function createStreamViewerInvitation(
  streamId: string,
): Promise<CreatedStreamViewerInvitation> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<CreatedStreamViewerInvitation>(
    `/api/streams/${encodedStreamId}/viewer-invitations`,
    isCreatedStreamViewerInvitation,
    { method: "POST" },
  );
}

export async function deleteStreamViewerInvitation(
  streamId: string,
  invitationId: string,
): Promise<void> {
  const encodedStreamId = encodeURIComponent(streamId);
  const encodedInvitationId = encodeURIComponent(invitationId);
  const response = await fetch(
    `/api/streams/${encodedStreamId}/viewer-invitations/${encodedInvitationId}`,
    { method: "DELETE" },
  );

  if (response.status === 204) {
    return;
  }

  const responseBody: unknown = await response.json();
  if (isApiErrorResponse(responseBody)) {
    throw new ApiError(
      response.status,
      responseBody.error.code,
      responseBody.error.message,
    );
  }

  throw new ApiError(
    response.status,
    "UNKNOWN_API_ERROR",
    `Request failed with status ${response.status}`,
  );
}

export function getViewerInvitationPlayback(
  token: string,
  signal?: AbortSignal,
): Promise<ViewerInvitationPlayback> {
  const encodedToken = encodeURIComponent(token);

  return request<ViewerInvitationPlayback>(
    `/api/viewer-invitations/${encodedToken}`,
    isViewerInvitationPlayback,
    createSignalInit(signal),
  );
}

export function createStream(
  requestBody: CreateStreamRequest,
  signal?: AbortSignal,
): Promise<CreateStreamResponse> {
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    ...createSignalInit(signal),
  };

  return request<CreateStreamResponse>("/api/streams", isStream, requestInit);
}

export function startStream(
  streamId: string,
  signal?: AbortSignal,
): Promise<ChangeStreamStatusResponse> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<ChangeStreamStatusResponse>(
    `/api/streams/${encodedStreamId}/start`,
    isStream,
    {
      method: "POST",
      ...createSignalInit(signal),
    },
  );
}

export function finishStream(
  streamId: string,
  signal?: AbortSignal,
): Promise<ChangeStreamStatusResponse> {
  const encodedStreamId = encodeURIComponent(streamId);

  return request<ChangeStreamStatusResponse>(
    `/api/streams/${encodedStreamId}/finish`,
    isStream,
    {
      method: "POST",
      ...createSignalInit(signal),
    },
  );
}
