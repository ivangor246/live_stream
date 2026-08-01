import { useEffect, useState } from "react";

import {
  getStreamRecordingPlaybackUrl,
  getStreamRecordings,
  getViewerInvitationRecordingPlaybackUrl,
  getViewerInvitationRecordings,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import type { RecordingSegment } from "../shared/api.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";

interface StreamArchiveProps {
  streamId: string;
  viewerToken?: string;
}

function getRecordingKey(recording: RecordingSegment): string {
  return `${recording.startAt}:${recording.durationSeconds}`;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return minutes > 0
    ? `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
    : `0:${String(remainingSeconds).padStart(2, "0")}`;
}

export function StreamArchive({ streamId, viewerToken }: StreamArchiveProps) {
  const { formatDate, t } = useI18n();
  const [recordings, setRecordings] = useState<RecordingSegment[]>([]);
  const [selectedRecording, setSelectedRecording] =
    useState<RecordingSegment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    async function loadRecordings(): Promise<void> {
      try {
        const loadedRecordings = viewerToken
          ? await getViewerInvitationRecordings(
              viewerToken,
              abortController.signal,
            )
          : await getStreamRecordings(streamId, abortController.signal);

        if (active) {
          setRecordings(loadedRecordings);
          setSelectedRecording((currentRecording) =>
            currentRecording ?? loadedRecordings[0] ?? null,
          );
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(localizeError(requestError, t, "errors.loadRecordings"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadRecordings();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [streamId, t, viewerToken]);

  const playbackUrl = selectedRecording
    ? viewerToken
      ? getViewerInvitationRecordingPlaybackUrl(viewerToken, selectedRecording)
      : getStreamRecordingPlaybackUrl(streamId, selectedRecording)
    : null;

  return (
    <Card as="section" className="stream-archive">
      <header>
        <h2>{t("archive.title")}</h2>
        <p>{t("archive.description")}</p>
      </header>

      {isLoading ? (
        <p>{t("archive.loading")}</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : recordings.length === 0 ? (
        <p>{t("archive.empty")}</p>
      ) : (
        <>
          <div className="stream-archive__list" role="list">
            {recordings.map((recording) => {
              const isSelected =
                selectedRecording !== null &&
                getRecordingKey(recording) === getRecordingKey(selectedRecording);

              return (
                <Button
                  key={getRecordingKey(recording)}
                  variant={isSelected ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedRecording(recording);
                  }}
                >
                  {t("archive.segment", {
                    start: formatDate(recording.startAt),
                    duration: formatDuration(recording.durationSeconds),
                  })}
                </Button>
              );
            })}
          </div>

          {playbackUrl && (
            <video
              key={playbackUrl}
              className="stream-archive__player"
              controls
              preload="metadata"
              src={playbackUrl}
            >
              {t("archive.playerUnsupported")}
            </video>
          )}
        </>
      )}
    </Card>
  );
}
