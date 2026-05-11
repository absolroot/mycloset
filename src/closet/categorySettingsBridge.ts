import { useEffect, useState } from "react"

export type CategoryDisplayPresetId = "all" | "core" | "men" | "women" | "custom"

export type CategoryDisplayPreset = {
  id: Exclude<CategoryDisplayPresetId, "custom">
  label: string
  description: string
  parentCategories: string[]
}

export type CategorySettingsSnapshot = {
  selectedPreset: CategoryDisplayPresetId
  presets: CategoryDisplayPreset[]
  allParents: string[]
  visibleParents: string[]
  hiddenParents: string[]
  parentCounts: Record<string, number>
}

const EMPTY_CATEGORY_SETTINGS_SNAPSHOT: CategorySettingsSnapshot = {
  selectedPreset: "all",
  presets: [],
  allParents: [],
  visibleParents: [],
  hiddenParents: [],
  parentCounts: {},
}

type CategorySettingsBridgeWindow = Window & {
  closetBridge?: {
    getCategorySettingsSnapshot?: () => CategorySettingsSnapshot
    setCategoryDisplayPreset?: (presetId: CategoryDisplayPresetId) => CategorySettingsSnapshot
    setCategoryParentVisible?: (parentCategory: string, visible: boolean) => CategorySettingsSnapshot
    subscribeCategorySettings?: (listener: (snapshot: CategorySettingsSnapshot) => void) => () => void
  }
}

function getCategorySettingsBridge() {
  return (window as CategorySettingsBridgeWindow).closetBridge
}

export function useCategorySettingsSnapshot() {
  const [snapshot, setSnapshot] = useState<CategorySettingsSnapshot>(EMPTY_CATEGORY_SETTINGS_SNAPSHOT)

  useEffect(() => {
    let timer: number | undefined

    const syncFromBridge = () => {
      const nextSnapshot = getCategorySettingsBridge()?.getCategorySettingsSnapshot?.()
      if (!nextSnapshot) return false
      setSnapshot(nextSnapshot)
      return true
    }

    const handleCategorySettingsChange = (event: Event) => {
      const detail = (event as CustomEvent<CategorySettingsSnapshot>).detail
      setSnapshot(detail || EMPTY_CATEGORY_SETTINGS_SNAPSHOT)
    }

    window.addEventListener("closet:category-settings-change", handleCategorySettingsChange)
    const unsubscribe = getCategorySettingsBridge()?.subscribeCategorySettings?.((nextSnapshot) => setSnapshot(nextSnapshot))

    if (!syncFromBridge() && !unsubscribe) {
      timer = window.setInterval(() => {
        if (syncFromBridge() && timer) {
          window.clearInterval(timer)
          timer = undefined
        }
      }, 250)
    }

    return () => {
      window.removeEventListener("closet:category-settings-change", handleCategorySettingsChange)
      unsubscribe?.()
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return snapshot
}

export function setCategoryDisplayPreset(presetId: CategoryDisplayPresetId) {
  getCategorySettingsBridge()?.setCategoryDisplayPreset?.(presetId)
}

export function setCategoryParentVisible(parentCategory: string, visible: boolean) {
  getCategorySettingsBridge()?.setCategoryParentVisible?.(parentCategory, visible)
}
