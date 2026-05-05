import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "./useTheme"

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환"

  return (
    <Button
      className={`theme-toggle-button ${className}`.trim()}
      type="button"
      variant="outline"
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
