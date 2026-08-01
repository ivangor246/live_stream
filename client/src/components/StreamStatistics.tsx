import { useI18n } from "../i18n/I18nProvider.js";

interface StreamStatisticsProps {
  viewerCount: number;
  reactionCount: number;
}

export function StreamStatistics({
  viewerCount,
  reactionCount,
}: StreamStatisticsProps) {
  const { t } = useI18n();

  return (
    <dl className="stream-statistics">
      <div>
        <dt>{t("streams.viewers")}</dt>
        <dd>{viewerCount}</dd>
      </div>

      <div>
        <dt>{t("streams.reactions")}</dt>
        <dd>{reactionCount}</dd>
      </div>
    </dl>
  );
}
