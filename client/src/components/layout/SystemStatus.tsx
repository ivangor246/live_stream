import { useI18n, type TranslationKey } from "../../i18n/I18nProvider.js";

export type SystemStatusState = "checking" | "ready" | "unavailable";

interface SystemStatusProps {
  status: SystemStatusState;
}

const statusKeys: Record<SystemStatusState, TranslationKey> = {
  checking: "system.checking",
  ready: "system.ready",
  unavailable: "system.unavailable",
};

export function SystemStatus({ status }: SystemStatusProps) {
  const { t } = useI18n();

  return (
    <p className={`system-status system-status--${status}`} role="status">
      <span aria-hidden="true" className="system-status__dot" />
      <span>
        {t("system.statusLabel")}: {t(statusKeys[status])}
      </span>
    </p>
  );
}
