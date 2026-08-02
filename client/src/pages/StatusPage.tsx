import { useEffect, useState } from "react";

import { getSystemStatus } from "../api/streamsApi.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type { ServiceHealth, SystemStatusResponse } from "../shared/api.js";

type ServiceName = "backend" | "database" | "media";

const serviceKeys: Record<ServiceName, TranslationKey> = {
  backend: "statusPage.backend",
  database: "statusPage.database",
  media: "statusPage.media",
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getBadgeStatus(status: ServiceHealth): "online" | "unavailable" {
  return status === "ok" ? "online" : "unavailable";
}

export function StatusPage() {
  const { formatDate, t } = useI18n();
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    async function loadStatus(): Promise<void> {
      try {
        const nextStatus = await getSystemStatus(abortController.signal);

        if (active) {
          setSystemStatus(nextStatus);
          setError(null);
        }
      } catch (requestError: unknown) {
        if (active && !isAbortError(requestError)) {
          setError(localizeError(requestError, t, "errors.loadSystemStatus"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void loadStatus();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [refreshVersion, t]);

  function handleRefresh(): void {
    setIsRefreshing(true);
    setRefreshVersion((version) => version + 1);
  }

  return (
    <main className="page-shell page-shell--narrow status-page">
      <header className="page-header status-page__header">
        <p className="eyebrow">{t("statusPage.eyebrow")}</p>
        <h1>{t("statusPage.title")}</h1>
        <p>{t("statusPage.description")}</p>
      </header>

      <Card as="section" className="service-status-card">
        <header className="service-status-card__header">
          <div>
            <h2>{t("statusPage.services")}</h2>
            {systemStatus && (
              <p>
                {t("statusPage.checkedAt", {
                  date: formatDate(systemStatus.checkedAt),
                })}
              </p>
            )}
          </div>
          <Button
            size="sm"
            disabled={isLoading || isRefreshing}
            onClick={handleRefresh}
          >
            {isRefreshing ? t("statusPage.refreshing") : t("statusPage.refresh")}
          </Button>
        </header>

        {isLoading ? (
          <p>{t("statusPage.loading")}</p>
        ) : error ? (
          <p role="alert">{t("statusPage.error", { message: error })}</p>
        ) : systemStatus ? (
          <dl className="service-status-list">
            {(Object.keys(serviceKeys) as ServiceName[]).map((service) => {
              const serviceStatus = systemStatus[service].status;

              return (
                <div key={service}>
                  <dt>{t(serviceKeys[service])}</dt>
                  <dd>
                    <StatusBadge
                      label={t(
                        serviceStatus === "ok"
                          ? "statusPage.operational"
                          : "statusPage.unavailable",
                      )}
                      status={getBadgeStatus(serviceStatus)}
                    />
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </Card>
    </main>
  );
}
