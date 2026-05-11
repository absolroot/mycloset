export type ThemeMode = "light" | "dark"

export const THEME_STORAGE_KEY = "jaaang-theme"
export const THEME_CHANGE_EVENT = "jaaang:theme-change"

const THEME_COLORS: Record<ThemeMode, string> = {
  light: "#ffffff",
  dark: "#18181b",
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark"
}

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(storedTheme) ? storedTheme : null
  } catch {
    return null
  }
}

export function getInitialTheme(): ThemeMode {
  return getStoredTheme() ?? "light"
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", theme === "dark")

  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeMeta?.setAttribute("content", THEME_COLORS[theme])
}

export function persistTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    return
  }
}

export function announceThemeChange(theme: ThemeMode) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }))
}
