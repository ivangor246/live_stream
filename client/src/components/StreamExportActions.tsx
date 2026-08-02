import { useState } from "react";

import { downloadStreamExport } from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import type { StreamExportFormat } from "../shared/api.js";
import { Button } from "./ui/Button.js";

function saveDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function StreamExportActions() {
  const { t } = useI18n();
  const [activeFormat, setActiveFormat] = useState<StreamExportFormat | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: StreamExportFormat): Promise<void> {
    setActiveFormat(format);
    setError(null);

    try {
      const download = await downloadStreamExport(format);
      saveDownload(download.blob, download.filename);
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.exportStreams"));
    } finally {
      setActiveFormat(null);
    }
  }

  return (
    <div className="stream-export-actions">
      <span className="stream-export-actions__label">{t("exports.label")}</span>
      <div className="stream-export-actions__buttons">
        <Button
          size="sm"
          disabled={activeFormat !== null}
          onClick={() => {
            void handleExport("csv");
          }}
        >
          {activeFormat === "csv" ? t("exports.exporting") : t("exports.downloadCsv")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={activeFormat !== null}
          onClick={() => {
            void handleExport("json");
          }}
        >
          {activeFormat === "json" ? t("exports.exporting") : t("exports.downloadJson")}
        </Button>
      </div>
      {error && <p role="alert">{t("exports.error", { message: error })}</p>}
    </div>
  );
}
