import { useCallback, useEffect, useState } from "react"
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  announceThemeChange,
  applyTheme,
  getInitialTheme,
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
      const nextTheme = isThemeMode(event.newValue) ? event.newValue : "light"
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      window.removeEventListener("storage", handleStorage)
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
