import type { Stream, StreamStatus } from "../shared/stream.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";
import { ButtonLink } from "./ui/ButtonLink.js";
import { Card } from "./ui/Card.js";
import { StatusBadge } from "./ui/StatusBadge.js";

interface StreamCardProps {
  stream: Stream;
  canManage: boolean;
  isUpdating: boolean;
  onStart: (streamId: string) => void;
  onFinish: (streamId: string) => void;
}

const statusKeys: Record<StreamStatus, TranslationKey> = {
  scheduled: "status.scheduled",
  live: "status.live",
  finished: "status.finished",
};

export function StreamCard({
  stream,
  canManage,
  isUpdating,
  onStart,
  onFinish,
}: StreamCardProps) {
  const { formatDate, t } = useI18n();

  return (
    <Card as="article" className={`stream-card stream-card--${stream.status}`}>
      <header className="stream-card__header">
        <h2>{stream.title}</h2>
        <StatusBadge status={stream.status} label={t(statusKeys[stream.status])} />
      </header>

      <dl className="stream-card__stats">
        <div>
          <dt>{t("streams.viewers")}</dt>
          <dd>{stream.viewerCount}</dd>
        </div>

        <div>
          <dt>{t("streams.reactions")}</dt>
          <dd>{stream.reactionCount}</dd>
        </div>

        <div>
          <dt>{t("streams.createdAt")}</dt>
          <dd>{formatDate(stream.createdAt)}</dd>
        </div>
      </dl>

      <div className="stream-card__actions">
        <ButtonLink to={`/streams/${stream.id}`} variant="secondary">
          {t("streams.open")}
        </ButtonLink>

        {canManage && stream.status === "scheduled" && (
          <Button
            variant="primary"
            disabled={isUpdating}
            onClick={() => {
              onStart(stream.id);
            }}
          >
            {isUpdating ? t("streams.starting") : t("streams.start")}
          </Button>
        )}

        {canManage && stream.status === "live" && (
          <Button
            variant="danger"
            disabled={isUpdating}
            onClick={() => {
              onFinish(stream.id);
            }}
          >
            {isUpdating ? t("streams.finishing") : t("streams.finish")}
          </Button>
        )}
      </div>
    </Card>
  );
}
