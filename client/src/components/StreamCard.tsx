import { Link } from "react-router-dom";

import type { Stream, StreamStatus } from "../../../shared/stream.js";

interface StreamCardProps {
  stream: Stream;
  isUpdating: boolean;
  onStart: (streamId: string) => void;
  onFinish: (streamId: string) => void;
}

const statusLabels: Record<StreamStatus, string> = {
  scheduled: "Запланирована",
  live: "В эфире",
  finished: "Завершена",
};

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function StreamCard({
  stream,
  isUpdating,
  onStart,
  onFinish,
}: StreamCardProps) {
  return (
    <article className={`stream-card stream-card--${stream.status}`}>
      <header className="stream-card__header">
        <h2>{stream.title}</h2>
        <p className="status-badge">{statusLabels[stream.status]}</p>
      </header>

      <dl className="stream-card__stats">
        <div>
          <dt>Зрители</dt>
          <dd>{stream.viewerCount}</dd>
        </div>

        <div>
          <dt>Реакции</dt>
          <dd>{stream.reactionCount}</dd>
        </div>

        <div>
          <dt>Создана</dt>
          <dd>{formatCreatedAt(stream.createdAt)}</dd>
        </div>
      </dl>

      <div className="stream-card__actions">
        <Link
          className="button button--secondary"
          to={`/streams/${stream.id}`}
        >
          Открыть
        </Link>

        {stream.status === "scheduled" && (
          <button
            className="button button--primary"
            type="button"
            disabled={isUpdating}
            onClick={() => {
              onStart(stream.id);
            }}
          >
            {isUpdating ? "Запуск..." : "Запустить"}
          </button>
        )}

        {stream.status === "live" && (
          <button
            className="button button--danger"
            type="button"
            disabled={isUpdating}
            onClick={() => {
              onFinish(stream.id);
            }}
          >
            {isUpdating ? "Завершение..." : "Завершить"}
          </button>
        )}
      </div>
    </article>
  );
}
