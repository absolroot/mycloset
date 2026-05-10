import { useEffect, useState } from "react"

export type AuthStatus = "guest" | "signed-in" | "signed-out"

export type AuthSnapshot = {
  status: AuthStatus
  displayName: string
  email: string
  avatarUrl: string
  syncing: boolean
  supabaseReady: boolean
  hasPendingSync: boolean
  pendingSyncCount: number
  lastSyncedAt: string
  lastSyncError: boolean
  lastSyncErrorMessage: string
  itemCount: number
  sampleItemCount?: number
  ownItemCount?: number
}

const GUEST_MODE_STORAGE_KEY = "closet-temporary-mode"

const EMPTY_AUTH_SNAPSHOT: AuthSnapshot = {
  status: "signed-out",
  displayName: "",
  email: "",
  avatarUrl: "",
  syncing: false,
  supabaseReady: false,
  hasPendingSync: false,
  pendingSyncCount: 0,
  lastSyncedAt: "",
  lastSyncError: false,
  lastSyncErrorMessage: "",
  itemCount: 0,
}

type AuthBridgeWindow = Window & {
  closetBridge?: {
    getAuthSnapshot?: () => AuthSnapshot
  }
}

function readFallbackAuthSnapshot(): AuthSnapshot {
  let isGuest = false
  try {
    isGuest = window.localStorage.getItem(GUEST_MODE_STORAGE_KEY) === "1"
  } catch {
    isGuest = false
  }
  return {
    ...EMPTY_AUTH_SNAPSHOT,
    status: isGuest ? "guest" : "signed-out",
  }
}

export function useAuthSnapshot() {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(() => {
    if (typeof window === "undefined") return EMPTY_AUTH_SNAPSHOT
    return readFallbackAuthSnapshot()
  })

  useEffect(() => {
    let timer: number | undefined

    const syncFromBridge = () => {
      const nextSnapshot = (window as AuthBridgeWindow).closetBridge?.getAuthSnapshot?.()
      if (!nextSnapshot) return false
      setSnapshot(nextSnapshot)
      return true
    }

    const handleAuthChange = (event: Event) => {
      const detail = (event as CustomEvent<AuthSnapshot>).detail
      setSnapshot(detail || readFallbackAuthSnapshot())
    }

    window.addEventListener("closet:auth-state-change", handleAuthChange)
    if (!syncFromBridge()) {
      timer = window.setInterval(() => {
        if (syncFromBridge() && timer) {
          window.clearInterval(timer)
          timer = undefined
        }
      }, 250)
    }

    return () => {
      window.removeEventListener("closet:auth-state-change", handleAuthChange)
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return snapshot
}
