import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "react-router-dom";

import type {
  Stream,
  StreamStatus,
} from "../shared/stream.js";
import {
  finishStream,
  getStream,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { ConnectionStatus } from "../components/ConnectionStatus.js";
import { ReactionPanel } from "../components/ReactionPanel.js";
import { StreamPlayer } from "../components/StreamPlayer.js";
import { StreamStatistics } from "../components/StreamStatistics.js";
import { Button } from "../components/ui/Button.js";
import { ButtonLink } from "../components/ui/ButtonLink.js";
import { useStreamSocket } from "../hooks/useStreamSocket.js";

interface StreamContentProps {
  stream: Stream;
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
  isFinishing,
  actionError,
  onFinish,
}: StreamContentProps) {
  const { t } = useI18n();
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
    <main className="page-shell page-shell--narrow stream-page">
      <ButtonLink className="back-link" to="/" variant="ghost">
        ← {t("navigation.back")}
      </ButtonLink>

      <header className="page-header stream-page__header">
        <h1>{stream.title}</h1>
        <p>
          {t("stream.status")}: <strong>{t(statusKeys[streamStatus])}</strong>
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
      setIsLoading(true);
      setLoadError(null);

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
  }, [streamId, t]);

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
