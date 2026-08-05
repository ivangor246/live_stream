import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { localizeErrorCode } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import type { StreamStatus } from "../shared/stream.js";
import type {
  ClientWebSocketMessage,
  ReactionType,
  ServerWebSocketMessage,
} from "../shared/websocket.js";
import type { SocketConnectionStatus } from "../types/websocket.js";

export interface UseStreamSocketResult {
  connectionStatus: SocketConnectionStatus;
  viewerCount: number;
  reactionCount: number;
  lastReaction: ReactionType | null;
  streamStatus: StreamStatus;
  error: string | null;
  sendReaction: (reaction: ReactionType) => void;
}

const reconnectInitialDelayMs = 1_000;
const reconnectMaximumDelayMs = 15_000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReactionType(
  value: unknown,
): value is ReactionType {
  return (
    value === "like" ||
    value === "dislike" ||
    value === "fire" ||
    value === "clap"
  );
}

function isStreamStatus(
  value: unknown,
): value is StreamStatus {
  return (
    value === "scheduled" ||
    value === "live" ||
    value === "finished"
  );
}

function isServerWebSocketMessage(
  value: unknown,
): value is ServerWebSocketMessage {
  if (!isRecord(value) || !isRecord(value.payload)) {
    return false;
  }

  switch (value.type) {
    case "stream:viewers-updated":
      return (
        typeof value.payload.streamId === "string" &&
        typeof value.payload.viewerCount === "number"
      );

    case "stream:reaction-received":
      return (
        typeof value.payload.streamId === "string" &&
        isReactionType(value.payload.reaction) &&
        typeof value.payload.reactionCount === "number"
      );

    case "stream:status-updated":
      return (
        typeof value.payload.streamId === "string" &&
        isStreamStatus(value.payload.status)
      );

    case "error":
      return (
        typeof value.payload.code === "string" &&
        typeof value.payload.message === "string"
      );

    default:
      return false;
  }
}

function createWebSocketUrl(): string {
  const protocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/ws`;
}

export function useStreamSocket(
  streamId: string,
  initialViewerCount: number,
  initialReactionCount: number,
  initialStreamStatus: StreamStatus,
  viewerName: string | null,
): UseStreamSocketResult {
  const { t } = useI18n();
  const viewerId = useMemo(() => crypto.randomUUID(), []);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(
    initialStreamStatus === "live" && Boolean(viewerName),
  );

  const [connectionStatus, setConnectionStatus] =
    useState<SocketConnectionStatus>(
      initialStreamStatus === "live" && viewerName ? "connecting" : "closed",
    );
  const [viewerCount, setViewerCount] = useState(
    initialViewerCount,
  );
  const [reactionCount, setReactionCount] = useState(
    initialReactionCount,
  );
  const [lastReaction, setLastReaction] =
    useState<ReactionType | null>(null);
  const [streamStatus, setStreamStatus] =
    useState<StreamStatus>(initialStreamStatus);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (initialStreamStatus !== "live" || !viewerName) {
      return;
    }

    const viewerNameForConnection = viewerName;
    let isActive = true;
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    function clearReconnectTimer(): void {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function scheduleReconnect(): void {
      if (!isActive || !shouldReconnectRef.current) {
        return;
      }

      const delay = Math.min(
        reconnectInitialDelayMs * 2 ** reconnectAttemptRef.current,
        reconnectMaximumDelayMs,
      );
      reconnectAttemptRef.current += 1;
      setConnectionStatus("reconnecting");
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    }

    function connect(): void {
      if (!isActive || !shouldReconnectRef.current) {
        return;
      }

      setConnectionStatus(
        reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting",
      );

      let socket: WebSocket;

      try {
        socket = new WebSocket(createWebSocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      socketRef.current = socket;

      function handleOpen(): void {
        if (!isActive) {
          return;
        }

        reconnectAttemptRef.current = 0;
        setConnectionStatus("open");
        setErrorCode(null);

        const joinMessage: ClientWebSocketMessage = {
          type: "viewer:join",
          payload: {
            streamId,
            viewerId,
            viewerName: viewerNameForConnection,
          },
        };

        socket.send(JSON.stringify(joinMessage));
      }

      function handleMessage(event: MessageEvent): void {
        if (!isActive) {
          return;
        }

        let parsedMessage: unknown;

        try {
          parsedMessage = JSON.parse(String(event.data));
        } catch {
          setErrorCode("INVALID_WEBSOCKET_JSON");
          return;
        }

        if (!isServerWebSocketMessage(parsedMessage)) {
          setErrorCode("INVALID_WEBSOCKET_MESSAGE");
          return;
        }

        switch (parsedMessage.type) {
          case "stream:viewers-updated":
            if (parsedMessage.payload.streamId === streamId) {
              setViewerCount(parsedMessage.payload.viewerCount);
            }
            break;

          case "stream:reaction-received":
            if (parsedMessage.payload.streamId === streamId) {
              setReactionCount(
                parsedMessage.payload.reactionCount,
              );
              setLastReaction(parsedMessage.payload.reaction);
            }
            break;

          case "stream:status-updated":
            if (parsedMessage.payload.streamId === streamId) {
              setStreamStatus(parsedMessage.payload.status);
              if (parsedMessage.payload.status !== "live") {
                shouldReconnectRef.current = false;
                clearReconnectTimer();
                socket.close();
              }
            }
            break;

          case "error":
            setErrorCode(parsedMessage.payload.code);
            break;
        }
      }

      function handleClose(event: CloseEvent): void {
        if (!isActive) {
          return;
        }

        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (event.code === 1008) {
          shouldReconnectRef.current = false;
          setConnectionStatus("closed");
          setErrorCode("AUTH_UNAUTHORIZED");
          return;
        }

        if (shouldReconnectRef.current) {
          scheduleReconnect();
          return;
        }

        setConnectionStatus("closed");
      }

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("message", handleMessage);
      socket.addEventListener("close", handleClose);
    }

    connect();

    return () => {
      isActive = false;
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [initialStreamStatus, streamId, viewerId, viewerName]);

  const sendReaction = useCallback(
    (reaction: ReactionType): void => {
      const socket = socketRef.current;

      if (streamStatus !== "live") {
        setErrorCode("WEBSOCKET_NOT_LIVE");
        return;
      }

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setErrorCode("WEBSOCKET_NOT_OPEN");
        return;
      }

      const message: ClientWebSocketMessage = {
        type: "reaction:send",
        payload: {
          streamId,
          viewerId,
          reaction,
        },
      };

      socket.send(JSON.stringify(message));
      setErrorCode(null);
    },
    [streamId, streamStatus, viewerId],
  );

  return {
    connectionStatus,
    viewerCount,
    reactionCount,
    lastReaction,
    streamStatus,
    error: errorCode ? localizeErrorCode(errorCode, t) : null,
    sendReaction,
  };
}
