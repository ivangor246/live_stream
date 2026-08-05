import { useCallback, useEffect, useMemo, useState } from "react";

import type { Stream } from "../shared/stream.js";
import type { CreateStreamRequest } from "../shared/api.js";
import {
  createStream as createStreamRequest,
  finishStream,
  getStreams,
  startStream,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import { CreateStreamForm } from "../components/CreateStreamForm.js";
import {
  StreamFilters,
  type StreamFilter,
  type StreamSort,
} from "../components/StreamFilters.js";
import { StreamCard } from "../components/StreamCard.js";
import { StreamExportActions } from "../components/StreamExportActions.js";
import { Button } from "../components/ui/Button.js";
import { useAuth } from "../auth/AuthProvider.js";
import { canManageStreams } from "../shared/auth.js";
import { InvitationPanel } from "../components/InvitationPanel.js";
import { AccountPanel } from "../components/AccountPanel.js";
import { ChangePasswordPanel } from "../components/ChangePasswordPanel.js";

type StreamStatusAction = (streamId: string) => Promise<Stream>;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function StreamsPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const canManageAllStreams = canManageStreams(user?.role);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStreamId, setUpdatingStreamId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StreamFilter>("all");
  const [sort, setSort] = useState<StreamSort>("newest");

  const visibleStreams = useMemo(() => {
    const filteredStreams =
      filter === "all"
        ? streams
        : streams.filter((stream) => stream.status === filter);

    return [...filteredStreams].sort((left, right) => {
      if (sort === "title") {
        return left.title.localeCompare(right.title, locale);
      }

      const leftDate = new Date(left.createdAt).getTime();
      const rightDate = new Date(right.createdAt).getTime();
      const direction = sort === "newest" ? -1 : 1;

      return (leftDate - rightDate) * direction;
    });
  }, [filter, locale, sort, streams]);

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

  const handleCreate = useCallback(async (
    request: CreateStreamRequest,
  ): Promise<void> => {
    const createdStream = await createStreamRequest(request);

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
      if (!window.confirm(t("streams.confirmFinish"))) {
        return;
      }

      void updateStreamStatus(streamId, finishStream);
    },
    [t, updateStreamStatus],
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">{t("app.eyebrow")}</p>
        <h1>{t("app.name")}</h1>
        <p>{t("app.description")}</p>
      </header>

      <CreateStreamForm onCreate={handleCreate} />
      {user && <ChangePasswordPanel />}
      {user?.role === "admin" && <InvitationPanel />}
      {user?.role === "admin" && <AccountPanel currentUserId={user.id} />}

      <section className="streams-section">
        <header className="streams-section__header">
          <div className="streams-section__heading">
            <h2>{t("streams.heading")}</h2>
            {!isLoading && !loadError && streams.length > 0 && (
              <span className="streams-count">
                {t("streams.count", {
                  visible: visibleStreams.length,
                  total: streams.length,
                })}
              </span>
            )}
          </div>
          {canManageAllStreams && <StreamExportActions />}
        </header>

        {isLoading && <p>{t("streams.loading")}</p>}

        {loadError && (
          <p role="alert">{t("streams.loadError", { message: loadError })}</p>
        )}

        {actionError && (
          <p role="alert">{t("streams.actionError", { message: actionError })}</p>
        )}

        {!isLoading && !loadError && streams.length === 0 && (
          <div className="empty-state">
            <p>{t("streams.empty")}</p>
            <p>{t("streams.emptyHint")}</p>
          </div>
        )}

        {!isLoading && !loadError && streams.length > 0 && (
          <>
            <StreamFilters
              filter={filter}
              sort={sort}
              hasChanges={filter !== "all" || sort !== "newest"}
              onFilterChange={setFilter}
              onSortChange={setSort}
              onReset={() => {
                setFilter("all");
                setSort("newest");
              }}
            />

            {visibleStreams.length === 0 ? (
              <div className="empty-state">
                <p>{t("streams.noMatches")}</p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilter("all");
                    setSort("newest");
                  }}
                >
                  {t("streams.resetFilters")}
                </Button>
              </div>
            ) : (
              <div className="streams-grid">
                {visibleStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    canManage={stream.canManage}
                    isUpdating={updatingStreamId === stream.id}
                    onStart={handleStart}
                    onFinish={handleFinish}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
