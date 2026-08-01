import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../../i18n/I18nProvider.js";
import { LanguageSwitcher } from "./LanguageSwitcher.js";
import { ThemeSwitcher } from "./ThemeSwitcher.js";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();

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
            <LanguageSwitcher locale={locale} onChange={setLocale} />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
