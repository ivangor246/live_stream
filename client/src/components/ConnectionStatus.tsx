import type { SocketConnectionStatus } from "../types/websocket.js";
import { useI18n } from "../i18n/I18nProvider.js";

interface ConnectionStatusProps {
  status: SocketConnectionStatus;
}

const connectionStatusKeys = {
  connecting: "connection.connecting",
  open: "connection.open",
  closed: "connection.closed",
  error: "connection.error",
} as const;

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { t } = useI18n();

  return (
    <p className={`connection-status connection-status--${status}`}>
      {t("stream.connectionLabel")}:{" "}
      <strong>{t(connectionStatusKeys[status])}</strong>
    </p>
  );
}
