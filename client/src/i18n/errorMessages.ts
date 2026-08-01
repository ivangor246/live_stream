import type { TranslationKey, Translator } from "./I18nProvider.js";
import { ApiError } from "../api/streamsApi.js";

const errorKeyByCode: Record<string, TranslationKey> = {
  INVALID_RESPONSE: "errors.invalidResponse",
  UNKNOWN_API_ERROR: "errors.network",
  STREAM_NOT_FOUND: "errors.STREAM_NOT_FOUND",
  STREAM_ALREADY_LIVE: "errors.STREAM_ALREADY_LIVE",
  STREAM_ALREADY_FINISHED: "errors.STREAM_ALREADY_FINISHED",
  STREAM_NOT_LIVE: "errors.STREAM_NOT_LIVE",
  VIEWER_NOT_CONNECTED: "errors.VIEWER_NOT_CONNECTED",
  CONNECTION_ALREADY_JOINED: "errors.CONNECTION_ALREADY_JOINED",
  CONNECTION_CONTEXT_MISMATCH: "errors.CONNECTION_CONTEXT_MISMATCH",
  INVALID_JSON: "errors.INVALID_JSON",
  INVALID_MESSAGE: "errors.INVALID_MESSAGE",
  INTERNAL_SERVER_ERROR: "errors.INTERNAL_SERVER_ERROR",
  AUTH_SETUP_COMPLETE: "errors.AUTH_SETUP_COMPLETE",
  AUTH_INVALID_CREDENTIALS: "errors.AUTH_INVALID_CREDENTIALS",
  AUTH_UNAUTHORIZED: "errors.AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "errors.AUTH_FORBIDDEN",
  AUTH_USERNAME_TAKEN: "errors.AUTH_USERNAME_TAKEN",
  INVITATION_INVALID: "errors.INVITATION_INVALID",
  INVITATION_NOT_FOUND: "errors.INVITATION_NOT_FOUND",
  VALIDATION_ERROR: "errors.VALIDATION_ERROR",
  MEDIA_SERVICE_UNAVAILABLE: "errors.MEDIA_SERVICE_UNAVAILABLE",
  MEDIA_PATH_CREATE_FAILED: "errors.MEDIA_PATH_CREATE_FAILED",
  MEDIA_PATH_DELETE_FAILED: "errors.MEDIA_PATH_DELETE_FAILED",
  WEBSOCKET_NOT_OPEN: "errors.WEBSOCKET_NOT_OPEN",
  WEBSOCKET_NOT_LIVE: "errors.WEBSOCKET_NOT_LIVE",
  INVALID_WEBSOCKET_JSON: "errors.INVALID_WEBSOCKET_JSON",
  INVALID_WEBSOCKET_MESSAGE: "errors.INVALID_WEBSOCKET_MESSAGE",
};

export function localizeError(
  error: unknown,
  t: Translator,
  fallback: TranslationKey,
): string {
  if (error instanceof ApiError) {
    return t(errorKeyByCode[error.code] ?? fallback);
  }

  if (error instanceof TypeError) {
    return t("errors.network");
  }

  return t(fallback);
}

export function localizeErrorCode(code: string, t: Translator): string {
  return t(errorKeyByCode[code] ?? "errors.default");
}
