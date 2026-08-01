/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const themeStorageKey = "live-stream-theme";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getInitialTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(themeStorageKey);

    if (isTheme(storedTheme)) {
      return storedTheme;
    }
  } catch {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = useCallback((): void => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [theme]);

  const contextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const contextValue = useContext(ThemeContext);

  if (!contextValue) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return contextValue;
}

export type { Theme };
