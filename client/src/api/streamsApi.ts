import type {
  ApiErrorResponse,
  ChangeStreamStatusResponse,
  CreateStreamRequest,
  CreateStreamResponse,
  GetStreamResponse,
  GetStreamsResponse,
  ReadinessResponse,
} from "../shared/api.js";

import type { Stream, StreamStatus } from "../shared/stream.js";

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

function isStreams(value: unknown): value is GetStreamsResponse {
  return Array.isArray(value) && value.every(isStream);
}

function isReadinessResponse(value: unknown): value is ReadinessResponse {
  if (!isRecord(value)) {
    return false;
  }

  return value.status === "ok" && value.database === "ok";
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
