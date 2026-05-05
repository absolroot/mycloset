import { useCallback, useEffect, useState } from "react"
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  announceThemeChange,
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  getSystemTheme,
  isThemeMode,
  persistTheme,
  type ThemeMode,
} from "./themeUtils"

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)

    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<{ theme?: unknown }>).detail?.theme
      if (isThemeMode(nextTheme)) {
        setThemeState(nextTheme)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      const nextTheme = isThemeMode(event.newValue) ? event.newValue : getSystemTheme()
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemChange = () => {
      if (getStoredTheme()) return
      const nextTheme = getSystemTheme()
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener("storage", handleStorage)
    mediaQuery.addEventListener("change", handleSystemChange)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      window.removeEventListener("storage", handleStorage)
      mediaQuery.removeEventListener("change", handleSystemChange)
    }
  }, [theme])

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    persistTheme(nextTheme)
    applyTheme(nextTheme)
    setThemeState(nextTheme)
    announceThemeChange(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  return { theme, setTheme, toggleTheme }
}
