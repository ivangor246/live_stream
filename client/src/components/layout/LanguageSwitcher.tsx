import { useI18n, type Locale } from "../../i18n/I18nProvider.js";
import { SelectField } from "../ui/SelectField.js";

interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
  const { t } = useI18n();

  return (
    <SelectField
      ariaLabel={t("controls.language")}
      className="language-switcher"
      options={[
        { value: "en", label: "EN" },
        { value: "ru", label: "RU" },
      ]}
      value={locale}
      onChange={onChange}
    />
  );
}
