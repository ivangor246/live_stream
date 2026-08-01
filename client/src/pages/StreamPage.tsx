import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import type {
  Stream,
  StreamStatus,
} from "../shared/stream.js";
import {
  finishStream,
  getStream,
} from "../api/streamsApi.js";
import { ConnectionStatus } from "../components/ConnectionStatus.js";
import { ReactionPanel } from "../components/ReactionPanel.js";
import { StreamPlayer } from "../components/StreamPlayer.js";
import { StreamStatistics } from "../components/StreamStatistics.js";
import { useStreamSocket } from "../hooks/useStreamSocket.js";

interface StreamContentProps {
  stream: Stream;
  isFinishing: boolean;
  actionError: string | null;
  onFinish: () => void;
}

const statusLabels: Record<StreamStatus, string> = {
  scheduled: "Запланирована",
  live: "В эфире",
  finished: "Завершена",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла неизвестная ошибка";
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function StreamContent({
  stream,
  isFinishing,
  actionError,
  onFinish,
}: StreamContentProps) {
  const {
    connectionStatus,
    viewerCount,
    reactionCount,
    lastReaction,
    streamStatus,
    error: socketError,
    sendReaction,
  } = useStreamSocket(
    stream.id,
    stream.viewerCount,
    stream.reactionCount,
    stream.status,
  );

  const reactionsDisabled =
    connectionStatus !== "open" ||
    streamStatus !== "live";

  return (
    <main className="page-shell stream-page">
      <Link className="back-link" to="/">
        ← К списку трансляций
      </Link>

      <header className="page-header stream-page__header">
        <h1>{stream.title}</h1>
        <p>
          Статус: <strong>{statusLabels[streamStatus]}</strong>
        </p>
      </header>

      <StreamPlayer status={streamStatus} />

      <ConnectionStatus status={connectionStatus} />

      <StreamStatistics
        viewerCount={viewerCount}
        reactionCount={reactionCount}
      />

      <ReactionPanel
        disabled={reactionsDisabled}
        lastReaction={lastReaction}
        onReaction={sendReaction}
      />

      {streamStatus === "live" && (
        <button
          className="button button--danger"
          type="button"
          disabled={isFinishing}
          onClick={onFinish}
        >
          {isFinishing
            ? "Завершение..."
            : "Завершить трансляцию"}
        </button>
      )}

      {socketError && (
        <p role="alert">
          Ошибка WebSocket: {socketError}
        </p>
      )}

      {actionError && (
        <p role="alert">
          Не удалось завершить трансляцию:{" "}
          {actionError}
        </p>
      )}
    </main>
  );
}

export function StreamPage() {
  const { streamId } = useParams<{
    streamId: string;
  }>();

  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!streamId) {
      return;
    }

    const currentStreamId = streamId;
    const abortController = new AbortController();

    async function loadStream(): Promise<void> {
      try {
        const loadedStream = await getStream(
          currentStreamId,
          abortController.signal,
        );

        setStream(loadedStream);
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setLoadError(getErrorMessage(error));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadStream();

    return () => {
      abortController.abort();
    };
  }, [streamId]);

  const handleFinish = useCallback((): void => {
    if (!streamId) {
      return;
    }

    const currentStreamId = streamId;

    async function runFinishRequest(): Promise<void> {
      setIsFinishing(true);
      setActionError(null);

      try {
        const updatedStream = await finishStream(
          currentStreamId,
        );
        setStream(updatedStream);
      } catch (error: unknown) {
        setActionError(getErrorMessage(error));
      } finally {
        setIsFinishing(false);
      }
    }

    void runFinishRequest();
  }, [streamId]);

  if (!streamId) {
    return (
      <main className="page-shell page-message">
        <h1>Неверный адрес трансляции</h1>
        <Link to="/">Вернуться к списку</Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page-shell page-message">
        <p>Загрузка трансляции...</p>
      </main>
    );
  }

  if (loadError || !stream) {
    return (
      <main className="page-shell page-message">
        <h1>Не удалось открыть трансляцию</h1>
        <p role="alert">
          {loadError ?? "Трансляция не найдена"}
        </p>
        <Link to="/">Вернуться к списку</Link>
      </main>
    );
  }

  return (
    <StreamContent
      key={`${stream.id}:${stream.status}`}
      stream={stream}
      isFinishing={isFinishing}
      actionError={actionError}
      onFinish={handleFinish}
    />
  );
}
