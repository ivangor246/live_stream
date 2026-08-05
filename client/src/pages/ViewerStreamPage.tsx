import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { getViewerInvitationPlayback } from "../api/streamsApi.js";
import { StreamPlayer } from "../components/StreamPlayer.js";
import { StreamArchive } from "../components/StreamArchive.js";
import { Card } from "../components/ui/Card.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type { ViewerInvitationPlayback } from "../shared/api.js";
import type { StreamStatus } from "../shared/stream.js";

const statusKeys: Record<StreamStatus, TranslationKey> = {
  scheduled: "status.scheduled",
  live: "status.live",
  finished: "status.finished",
};

const playbackRefreshInterval = 5_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ViewerStreamPage() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const [content, setContent] = useState<ViewerInvitationPlayback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = Boolean(token) && content === null && error === null;

  useEffect(() => {
    if (!token) {
      return;
    }

    const invitationToken = token;
    const abortController = new AbortController();
    let active = true;

    async function loadViewerStream(): Promise<void> {
      try {
        const loadedContent = await getViewerInvitationPlayback(
          invitationToken,
          abortController.signal,
        );

        if (active) {
          setContent(loadedContent);
        }
      } catch (requestError: unknown) {
        if (active && !isAbortError(requestError)) {
          setError(localizeError(requestError, t, "errors.loadViewerStream"));
        }
      }
    }

    void loadViewerStream();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [t, token]);

  useEffect(() => {
    if (!token || content?.stream.status !== "live") {
      return;
    }

    const invitationToken = token;
    const abortController = new AbortController();
    let active = true;
    let isRefreshing = false;

    async function refreshPlayback(): Promise<void> {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;

      try {
        const refreshedContent = await getViewerInvitationPlayback(
          invitationToken,
          abortController.signal,
        );

        if (active) {
          setContent(refreshedContent);
          setError(null);
        }
      } catch (requestError: unknown) {
        if (active && !isAbortError(requestError)) {
          setError(localizeError(requestError, t, "errors.loadViewerStream"));
        }
      } finally {
        isRefreshing = false;
      }
    }

    const intervalId = window.setInterval(
      () => void refreshPlayback(),
      playbackRefreshInterval,
    );

    return () => {
      active = false;
      abortController.abort();
      window.clearInterval(intervalId);
    };
  }, [content?.stream.status, t, token]);

  if (isLoading) {
    return (
      <main className="page-shell auth-page">
        <Card as="section" className="auth-card">
          <p>{t("viewerStream.loading")}</p>
        </Card>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="page-shell auth-page">
        <Card as="section" className="auth-card">
          <h1>{t("viewerStream.unavailableTitle")}</h1>
          <p>{error ?? t("viewerStream.unavailableDescription")}</p>
        </Card>
      </main>
    );
  }

  const { playback, stream } = content;

  return (
    <main className="page-shell page-shell--narrow stream-page viewer-stream-page">
      <header className="page-header stream-page__header">
        <p className="eyebrow">{t("viewerStream.eyebrow")}</p>
        <h1>{stream.title}</h1>
        <p>
          {t("stream.status")}: <strong>{t(statusKeys[stream.status])}</strong>
        </p>
      </header>

      <StreamPlayer status={stream.status} connection={playback} />

      {stream.status === "finished" && token && (
        <StreamArchive streamId={stream.id} viewerToken={token} />
      )}
    </main>
  );
}
