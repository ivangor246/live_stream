import type { ChangeEvent } from "react";

import { useI18n, type Locale } from "../../i18n/I18nProvider.js";

interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
  const { t } = useI18n();

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextLocale = event.target.value;

    if (nextLocale === "en" || nextLocale === "ru") {
      onChange(nextLocale);
    }
  }

  return (
    <label className="language-switcher">
      <span className="visually-hidden">{t("controls.language")}</span>
      <select aria-label={t("controls.language")} value={locale} onChange={handleChange}>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
    </label>
  );
}
