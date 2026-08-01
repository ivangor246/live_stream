import type { StreamConnection } from "../shared/api.js";
import { useI18n } from "../i18n/I18nProvider.js";
import { CopyField } from "./ui/CopyField.js";
import { Card } from "./ui/Card.js";

interface StreamConnectionPanelProps {
  connection: StreamConnection;
}

export function StreamConnectionPanel({
  connection,
}: StreamConnectionPanelProps) {
  const { t } = useI18n();

  return (
    <Card as="section" className="stream-connection">
      <header>
        <h2>{t("stream.connectionTitle")}</h2>
        <p>{t("stream.connectionDescription")}</p>
      </header>

      <div className="stream-connection__fields">
        <CopyField label={t("stream.rtmpUrl")} value={connection.rtmpUrl} />
        <CopyField label={t("stream.streamKey")} value={connection.streamKey} />
        <CopyField label={t("stream.hlsUrl")} value={connection.hlsUrl} />
        <CopyField label={t("stream.webrtcUrl")} value={connection.webrtcUrl} />
      </div>

      <div className="stream-connection__links">
        <a href={connection.hlsUrl} target="_blank" rel="noreferrer">
          {t("stream.openHls")}
        </a>
        <a href={connection.webrtcUrl} target="_blank" rel="noreferrer">
          {t("stream.openWebrtc")}
        </a>
      </div>
    </Card>
  );
}
