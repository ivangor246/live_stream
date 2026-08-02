import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider.js";
import { getSystemStatus } from "../../api/streamsApi.js";
import { Button } from "../ui/Button.js";
import { useI18n } from "../../i18n/I18nProvider.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { SystemStatus, type SystemStatusState } from "./SystemStatus.js";
import { ThemeSwitcher } from "./ThemeSwitcher.js";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();
  const { user, logout } = useAuth();
  const [systemStatus, setSystemStatus] =
    useState<SystemStatusState>("checking");

  useEffect(() => {
    const abortController = new AbortController();

    async function checkSystemStatus(): Promise<void> {
      try {
        const nextStatus = await getSystemStatus(abortController.signal);

        if (!abortController.signal.aborted) {
          setSystemStatus(
            nextStatus.status === "ready" ? "ready" : "unavailable",
          );
        }
      } catch {
        if (!abortController.signal.aborted) {
          setSystemStatus("unavailable");
        }
      }
    }

    void checkSystemStatus();
    const intervalId = window.setInterval(() => {
      void checkSystemStatus();
    }, 30_000);

    return () => {
      abortController.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="page-container app-header__inner">
          <Link className="brand" to="/">
            <span aria-hidden="true" className="brand__mark">
              ◉
            </span>
            <span>{t("app.name")}</span>
          </Link>

          <div className="app-header__controls">
            <Link className="system-status-link" to="/status">
              <SystemStatus status={systemStatus} />
            </Link>
            {user && (
              <>
                <span className="auth-account">
                  {t("auth.account", { username: user.username })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void logout()}
                >
                  {t("auth.logout")}
                </Button>
              </>
            )}
            <LanguageSwitcher locale={locale} onChange={setLocale} />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
