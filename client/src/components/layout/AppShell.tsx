import type { ReactNode } from "react";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import LoginIcon from "@mui/icons-material/Login";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider.js";
import { Button } from "../ui/Button.js";
import { ButtonLink } from "../ui/ButtonLink.js";
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
                  <LogoutIcon aria-hidden="true" fontSize="small" />
                  {t("auth.logout")}
                </Button>
              </>
            )}
            {!user && state === "setup" && (
              <ButtonLink size="sm" to="/auth" variant="primary">
                <AppRegistrationIcon aria-hidden="true" fontSize="small" />
                {t("auth.register")}
              </ButtonLink>
            )}
            {!user && state === "unauthenticated" && (
              <ButtonLink size="sm" to="/auth" variant="primary">
                <LoginIcon aria-hidden="true" fontSize="small" />
                {t("auth.loginSubmit")}
              </ButtonLink>
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
