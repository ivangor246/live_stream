import { useCallback, useEffect, useState } from "react";

import type { Stream } from "../shared/stream.js";
import {
  createStream as createStreamRequest,
  finishStream,
  getStreams,
  startStream,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import { CreateStreamForm } from "../components/CreateStreamForm.js";
import { StreamCard } from "../components/StreamCard.js";

type StreamStatusAction = (streamId: string) => Promise<Stream>;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function StreamsPage() {
  const { t } = useI18n();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStreamId, setUpdatingStreamId] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadStreams(): Promise<void> {
      try {
        const loadedStreams = await getStreams(abortController.signal);

        setStreams(loadedStreams);
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setLoadError(localizeError(error, t, "errors.loadStreams"));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadStreams();

    return () => {
      abortController.abort();
    };
  }, [t]);

  const handleCreate = useCallback(async (title: string): Promise<void> => {
    const createdStream = await createStreamRequest({
      title,
    });

    setStreams((currentStreams) => [createdStream, ...currentStreams]);
  }, []);

  const updateStreamStatus = useCallback(
    async (streamId: string, action: StreamStatusAction): Promise<void> => {
      setUpdatingStreamId(streamId);
      setActionError(null);

      try {
        const updatedStream = await action(streamId);

        setStreams((currentStreams) =>
          currentStreams.map((stream) =>
            stream.id === updatedStream.id ? updatedStream : stream,
          ),
        );
      } catch (error: unknown) {
        setActionError(localizeError(error, t, "errors.updateStream"));
      } finally {
        setUpdatingStreamId((currentStreamId) =>
          currentStreamId === streamId ? null : currentStreamId,
        );
      }
    },
    [t],
  );

  const handleStart = useCallback(
    (streamId: string): void => {
      void updateStreamStatus(streamId, startStream);
    },
    [updateStreamStatus],
  );

  const handleFinish = useCallback(
    (streamId: string): void => {
      void updateStreamStatus(streamId, finishStream);
    },
    [updateStreamStatus],
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">{t("app.eyebrow")}</p>
        <h1>{t("app.name")}</h1>
        <p>{t("app.description")}</p>
      </header>

      <CreateStreamForm onCreate={handleCreate} />

      <section className="streams-section">
        <h2>{t("streams.heading")}</h2>

        {isLoading && <p>{t("streams.loading")}</p>}

        {loadError && (
          <p role="alert">{t("streams.loadError", { message: loadError })}</p>
        )}

        {actionError && (
          <p role="alert">{t("streams.actionError", { message: actionError })}</p>
        )}

        {!isLoading && !loadError && streams.length === 0 && (
          <p>{t("streams.empty")}</p>
        )}

        {!isLoading && streams.length > 0 && (
          <div className="streams-grid">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                isUpdating={updatingStreamId === stream.id}
                onStart={handleStart}
                onFinish={handleFinish}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
