import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StreamStatus,
} from "../shared/stream.js";
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
): UseStreamSocketResult {
  const viewerId = useMemo(() => crypto.randomUUID(), []);
  const socketRef = useRef<WebSocket | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<SocketConnectionStatus>(
      initialStreamStatus === "live" ? "connecting" : "closed",
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStreamStatus !== "live") {
      return;
    }

    let isActive = true;
    const socket = new WebSocket(createWebSocketUrl());

    socketRef.current = socket;

    function handleOpen(): void {
      if (!isActive) {
        return;
      }

      setConnectionStatus("open");
      setError(null);

      const joinMessage: ClientWebSocketMessage = {
        type: "viewer:join",
        payload: {
          streamId,
          viewerId,
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
        setError("Server sent invalid JSON");
        return;
      }

      if (!isServerWebSocketMessage(parsedMessage)) {
        setError("Server sent an invalid WebSocket message");
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
          }
          break;

        case "error":
          setError(parsedMessage.payload.message);
          break;
      }
    }

    function handleError(): void {
      if (!isActive) {
        return;
      }

      setConnectionStatus("error");
      setError("WebSocket connection failed");
    }

    function handleClose(): void {
      if (!isActive) {
        return;
      }

      socketRef.current = null;
      setConnectionStatus("closed");
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);

    return () => {
      isActive = false;
      socketRef.current = null;

      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      socket.close();
    };
  }, [initialStreamStatus, streamId, viewerId]);

  const sendReaction = useCallback(
    (reaction: ReactionType): void => {
      const socket = socketRef.current;

      if (streamStatus !== "live") {
        setError("Завершённая трансляция не принимает реакции");
        return;
      }

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError("WebSocket connection is not open");
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
      setError(null);
    },
    [streamId, streamStatus, viewerId],
  );

  return {
    connectionStatus,
    viewerCount,
    reactionCount,
    lastReaction,
    streamStatus,
    error,
    sendReaction,
  };
}
