import { useEffect, useState } from "react"
import { EMPTY_SNAPSHOT, type ClosetFilters, type FilterBridge, type FilterKey, type FilterSnapshot } from "./filterTypes"

export function useFilterSnapshot() {
  const [snapshot, setSnapshot] = useState<FilterSnapshot>(EMPTY_SNAPSHOT)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let timer: number | undefined
    let syncedInitialRender = false

    const connectBridge = () => {
      const bridge = getFilterBridge()
      const nextSnapshot = bridge?.getFilterSnapshot?.()
      if (nextSnapshot) {
        setSnapshot(nextSnapshot)

        if (!syncedInitialRender) {
          syncedInitialRender = true
          bridge?.setFilters?.({})
        }
      }
      if (!unsubscribe && bridge?.subscribeFilters) {
        unsubscribe = bridge.subscribeFilters((nextSnapshot) => setSnapshot(nextSnapshot))
        if (timer) {
          window.clearInterval(timer)
          timer = undefined
        }
        return true
      }
      return false
    }

    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<FilterSnapshot>).detail
      if (detail) setSnapshot(detail)
    }

    window.addEventListener("closet:filters-change", handleEvent)
    if (!connectBridge()) timer = window.setInterval(connectBridge, 250)

    return () => {
      window.removeEventListener("closet:filters-change", handleEvent)
      if (timer) window.clearInterval(timer)
      unsubscribe?.()
    }
  }, [])

  return snapshot
}

export function toggleFilterValue(key: FilterKey, value: string, snapshot: FilterSnapshot) {
  const selected = snapshot.filters[key]
  const nextValues = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
  setBridgeFilters({ [key]: nextValues })
}

export function getActiveCount(snapshot: FilterSnapshot, key: FilterKey) {
  return snapshot.filters[key].length
}

export function setBridgeFilters(nextPartialFilters: Partial<ClosetFilters>) {
  getFilterBridge()?.setFilters?.(nextPartialFilters)
}

export function getFilterBridge() {
  return window.closetBridge as unknown as FilterBridge | undefined
}
