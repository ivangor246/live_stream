import type { StreamStatus } from "../shared/stream.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";

interface StreamPlayerProps {
  status: StreamStatus;
}

const playerMessages: Record<StreamStatus, TranslationKey> = {
  scheduled: "stream.scheduledMessage",
  live: "stream.liveMessage",
  finished: "stream.finishedMessage",
};

export function StreamPlayer({
  status,
}: StreamPlayerProps) {
  const { t } = useI18n();

  return (
    <section className="stream-player" aria-label={t("stream.playerLabel")}>
      <div
        className="stream-player__screen"
        role="img"
        aria-label={t("stream.playerPlaceholder")}
      >
        📺
      </div>

      <p>{t(playerMessages[status])}</p>
    </section>
  );
}
