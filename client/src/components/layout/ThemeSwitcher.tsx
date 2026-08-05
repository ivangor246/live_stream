import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

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
      {theme === "dark" ? (
        <DarkModeIcon aria-hidden="true" fontSize="small" />
      ) : (
        <LightModeIcon aria-hidden="true" fontSize="small" />
      )}
      <span className="theme-switcher__label">
        {theme === "light" ? t("controls.lightTheme") : t("controls.darkTheme")}
      </span>
    </Button>
  );
}
