import type { ReactNode } from "react";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider.js";
import { Button } from "../ui/Button.js";
import { useI18n } from "../../i18n/I18nProvider.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { ThemeSwitcher } from "./ThemeSwitcher.js";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();
  const { state, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="page-container app-header__inner">
          <Link className="brand" to="/">
            <span aria-hidden="true" className="brand__mark">
              <LiveTvIcon fontSize="small" />
            </span>
            <span>{t("app.name")}</span>
          </Link>

          <div className="app-header__controls">
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
            {!user && (state === "setup" || state === "unauthenticated") && (
              <Link className="button button--sm button--ghost" to="/auth">
                {t("auth.loginSubmit")}
              </Link>
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
