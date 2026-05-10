import { useEffect, useState } from "react"

export type StarterStepKey = "sampleOpened" | "itemSaved" | "analysisViewed" | "myViewed"

export type StarterStep = {
  key: StarterStepKey
  label: string
  description: string
  done: boolean
}

export type StarterSnapshot = {
  visible: boolean
  completed: boolean
  completedCount: number
  totalCount: number
  steps: StarterStep[]
  sampleOnly: boolean
  sampleCount: number
  ownCount: number
}

const EMPTY_STARTER_SNAPSHOT: StarterSnapshot = {
  visible: false,
  completed: false,
  completedCount: 0,
  totalCount: 4,
  steps: [],
  sampleOnly: false,
  sampleCount: 0,
  ownCount: 0,
}

type StarterBridgeWindow = Window & {
  closetBridge?: {
    createStarterItem?: () => unknown
    dismissStarterChecklist?: () => StarterSnapshot
    getStarterSnapshot?: () => StarterSnapshot
    markStarterStep?: (step: StarterStepKey) => StarterSnapshot
    openFirstGuestSample?: () => unknown
    subscribeStarter?: (listener: (snapshot: StarterSnapshot) => void) => () => void
  }
}

export function getStarterBridge() {
  return (window as StarterBridgeWindow).closetBridge
}

export function useStarterSnapshot() {
  const [snapshot, setSnapshot] = useState<StarterSnapshot>(EMPTY_STARTER_SNAPSHOT)

  useEffect(() => {
    let timer: number | undefined

    const syncFromBridge = () => {
      const nextSnapshot = getStarterBridge()?.getStarterSnapshot?.()
      if (!nextSnapshot) return false
      setSnapshot(nextSnapshot)
      return true
    }

    const handleStarterChange = (event: Event) => {
      const detail = (event as CustomEvent<StarterSnapshot>).detail
      setSnapshot(detail || EMPTY_STARTER_SNAPSHOT)
    }

    window.addEventListener("closet:starter-change", handleStarterChange)
    const unsubscribe = getStarterBridge()?.subscribeStarter?.((nextSnapshot) => setSnapshot(nextSnapshot))

    if (!syncFromBridge() && !unsubscribe) {
      timer = window.setInterval(() => {
        if (syncFromBridge() && timer) {
          window.clearInterval(timer)
          timer = undefined
        }
      }, 250)
    }

    return () => {
      window.removeEventListener("closet:starter-change", handleStarterChange)
      unsubscribe?.()
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return snapshot
}
