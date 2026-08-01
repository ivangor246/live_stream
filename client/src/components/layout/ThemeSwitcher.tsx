import { useI18n } from "../../i18n/I18nProvider.js";
import { useTheme } from "../../theme/ThemeProvider.js";
import { Button } from "../ui/Button.js";

export function ThemeSwitcher() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "light" ? t("controls.darkTheme") : t("controls.lightTheme");

  return (
    <Button
      aria-label={`${t("controls.switchTheme")}: ${nextThemeLabel}`}
      size="sm"
      variant="ghost"
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
      <span className="theme-switcher__label">
        {theme === "light" ? t("controls.lightTheme") : t("controls.darkTheme")}
      </span>
    </Button>
  );
}
