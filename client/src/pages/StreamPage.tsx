import {
  useCallback,
  useEffect,
  useState,
} from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams } from "react-router";

import type {
  Stream,
  StreamStatus,
} from "../shared/stream.js";
import type { StreamConnection, StreamPlayback } from "../shared/api.js";
import {
  finishStream,
  getStream,
  getStreamConnection,
  getStreamPlayback,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { ConnectionStatus } from "../components/ConnectionStatus.js";
import { ReactionPanel } from "../components/ReactionPanel.js";
import { StreamConnectionPanel } from "../components/StreamConnectionPanel.js";
import { StreamArchive } from "../components/StreamArchive.js";
import { StreamPlayer } from "../components/StreamPlayer.js";
import { StreamStatistics } from "../components/StreamStatistics.js";
import { ViewerAccessPanel } from "../components/ViewerAccessPanel.js";
import { ViewerNameDialog } from "../components/ViewerNameDialog.js";
import { Button } from "../components/ui/Button.js";
import { ButtonLink } from "../components/ui/ButtonLink.js";
import { useStreamSocket } from "../hooks/useStreamSocket.js";

const mediaStatusRefreshInterval = 5_000;

interface StreamContentProps {
  stream: Stream;
  playback: StreamPlayback | null;
  connection: StreamConnection | null;
  canManage: boolean;
  connectionError: string | null;
  isFinishing: boolean;
  actionError: string | null;
  onFinish: () => void;
}

const statusKeys: Record<StreamStatus, TranslationKey> = {
  scheduled: "status.scheduled",
  live: "status.live",
  finished: "status.finished",
};

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function StreamContent({
  stream,
  playback,
  connection,
  canManage,
  connectionError,
  isFinishing,
  actionError,
  onFinish,
}: StreamContentProps) {
  const { formatDate, t } = useI18n();
  const [viewerName, setViewerName] = useState<string | null>(null);
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
    viewerName,
  );

  const reactionsDisabled =
    connectionStatus !== "open" ||
    streamStatus !== "live";

  return (
    <main className="page-shell page-shell--narrow stream-page">
      <ButtonLink className="back-link" to="/" variant="ghost">
        <ArrowBackIcon aria-hidden="true" fontSize="small" />
        {t("navigation.back")}
      </ButtonLink>

      <header className="page-header stream-page__header">
        <h1>{stream.title}</h1>
        <p>
          {t("stream.status")}: <strong>{t(statusKeys[streamStatus])}</strong>
        </p>
        {stream.scheduledAt && (
          <p>{t("stream.plannedStart", { date: formatDate(stream.scheduledAt) })}</p>
        )}
      </header>

      {streamStatus === "live" && !viewerName ? (
        <ViewerNameDialog onJoin={setViewerName} />
      ) : (
        <StreamPlayer status={streamStatus} connection={playback} />
      )}

      {streamStatus === "finished" && <StreamArchive streamId={stream.id} />}

      {canManage && connection && <StreamConnectionPanel connection={connection} />}

      {canManage && stream.isPrivate && (
        <ViewerAccessPanel streamId={stream.id} />
      )}

      {connectionError && (
        <p role="alert">
          {t("stream.connectionError", { message: connectionError })}
        </p>
      )}

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

      {canManage && streamStatus === "live" && (
        <Button
          variant="danger"
          disabled={isFinishing}
          onClick={onFinish}
        >
          {isFinishing ? t("streams.finishing") : t("streams.finish")}
        </Button>
      )}

      {socketError && (
        <p role="alert">{t("stream.socketError", { message: socketError })}</p>
      )}

      {actionError && (
        <p role="alert">{t("stream.actionError", { message: actionError })}</p>
      )}
    </main>
  );
}

export function StreamPage() {
  const { t } = useI18n();
  const { streamId } = useParams<{
    streamId: string;
  }>();

  const [stream, setStream] = useState<Stream | null>(null);
  const [playback, setPlayback] = useState<StreamPlayback | null>(null);
  const [connection, setConnection] = useState<StreamConnection | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionErrorStreamId, setConnectionErrorStreamId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const canManage = stream?.canManage ?? false;

  useEffect(() => {
    if (!streamId) {
      return;
    }

    const currentStreamId = streamId;
    const abortController = new AbortController();

    async function loadStream(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      setPlayback(null);
      setConnection(null);
      setConnectionError(null);
      setConnectionErrorStreamId(null);

      try {
        const loadedStream = await getStream(
          currentStreamId,
          abortController.signal,
        );

        setStream(loadedStream);

        try {
          if (loadedStream.canManage) {
            const streamConnection = await getStreamConnection(
              currentStreamId,
              abortController.signal,
            );

            setConnection(streamConnection);
            setPlayback(streamConnection);
          } else {
            const streamPlayback = await getStreamPlayback(
              currentStreamId,
              abortController.signal,
            );

            setPlayback(streamPlayback);
          }
        } catch (error: unknown) {
          if (!isAbortError(error)) {
            setConnectionError(
              localizeError(error, t, "errors.loadConnection"),
            );
            setConnectionErrorStreamId(currentStreamId);
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setLoadError(localizeError(error, t, "errors.loadStream"));
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
  }, [canManage, streamId, t]);

  useEffect(() => {
    if (!streamId || stream?.id !== streamId || stream.status !== "live") {
      return;
    }

    const currentStreamId = streamId;
    const abortController = new AbortController();
    let active = true;

    async function refreshMediaStatus(): Promise<void> {
      try {
        if (canManage) {
          const streamConnection = await getStreamConnection(
            currentStreamId,
            abortController.signal,
          );

          if (!active) {
            return;
          }

          setConnection(streamConnection);
          setPlayback(streamConnection);
        } else {
          const streamPlayback = await getStreamPlayback(
            currentStreamId,
            abortController.signal,
          );

          if (!active) {
            return;
          }

          setPlayback(streamPlayback);
        }
        setConnectionError(null);
        setConnectionErrorStreamId(null);
      } catch (error: unknown) {
        if (!active || isAbortError(error)) {
          return;
        }

        setConnectionError(
          localizeError(error, t, "errors.loadConnection"),
        );
        setConnectionErrorStreamId(currentStreamId);
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshMediaStatus();
    }, mediaStatusRefreshInterval);

    return () => {
      active = false;
      abortController.abort();
      window.clearInterval(intervalId);
    };
  }, [canManage, stream?.id, stream?.status, streamId, t]);

  const handleFinish = useCallback((): void => {
    if (!streamId || !window.confirm(t("streams.confirmFinish"))) {
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
        setActionError(localizeError(error, t, "errors.updateStream"));
      } finally {
        setIsFinishing(false);
      }
    }

    void runFinishRequest();
  }, [streamId, t]);

  if (!streamId) {
    return (
      <main className="page-shell page-message">
        <h1>{t("stream.invalidAddressTitle")}</h1>
        <ButtonLink to="/">{t("navigation.home")}</ButtonLink>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page-shell page-message">
        <p>{t("stream.loading")}</p>
      </main>
    );
  }

  if (loadError || !stream) {
    return (
      <main className="page-shell page-message">
        <h1>{t("stream.loadErrorTitle")}</h1>
        <p role="alert">{loadError ?? t("stream.notFound")}</p>
        <ButtonLink to="/">{t("navigation.home")}</ButtonLink>
      </main>
    );
  }

  const activePlayback =
    playback?.streamId === stream.id ? playback : null;
  const activeConnection =
    connection?.streamId === stream.id ? connection : null;
  const activeConnectionError =
    connectionErrorStreamId === stream.id ? connectionError : null;

  return (
    <StreamContent
      key={`${stream.id}:${stream.status}`}
      stream={stream}
      playback={activePlayback}
      connection={activeConnection}
      canManage={canManage}
      connectionError={activeConnectionError}
      isFinishing={isFinishing}
      actionError={actionError}
      onFinish={handleFinish}
    />
  );
}
