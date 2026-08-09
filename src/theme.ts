const THEME_KEY = "taskpilot:theme";

export type Theme = "light" | "dark";

/** Reads the persisted theme, falling back to the user's OS preference. */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies the theme to <html> and persists the choice. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_KEY, theme);
}

/** Inline script string to run before paint, avoiding a flash of the wrong theme. */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_KEY}");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
