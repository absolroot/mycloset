import { useEffect, useState } from "react"

export type CategoryTreeChild = {
  name: string
  visible: boolean
  count: number
}

export type CategoryTreeParent = {
  name: string
  visible: boolean
  count: number
  children: CategoryTreeChild[]
}

export type CategorySettingsSnapshot = {
  allParents: string[]
  visibleParents: string[]
  hiddenParents: string[]
  hiddenChildren: Record<string, string[]>
  parentCounts: Record<string, number>
  tree: CategoryTreeParent[]
  totalChildCount: number
  visibleChildCount: number
}

const EMPTY_CATEGORY_SETTINGS_SNAPSHOT: CategorySettingsSnapshot = {
  allParents: [],
  visibleParents: [],
  hiddenParents: [],
  hiddenChildren: {},
  parentCounts: {},
  tree: [],
  totalChildCount: 0,
  visibleChildCount: 0,
}

type CategorySettingsBridgeWindow = Window & {
  closetBridge?: {
    getCategorySettingsSnapshot?: () => CategorySettingsSnapshot
    resetCategoryVisibility?: () => CategorySettingsSnapshot
    setCategoryChildVisible?: (parentCategory: string, childCategory: string, visible: boolean) => CategorySettingsSnapshot
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

export function resetCategoryVisibility() {
  getCategorySettingsBridge()?.resetCategoryVisibility?.()
}

export function setCategoryParentVisible(parentCategory: string, visible: boolean) {
  getCategorySettingsBridge()?.setCategoryParentVisible?.(parentCategory, visible)
}

export function setCategoryChildVisible(parentCategory: string, childCategory: string, visible: boolean) {
  getCategorySettingsBridge()?.setCategoryChildVisible?.(parentCategory, childCategory, visible)
}
