import { useEffect } from "react"

const MOBILE_FIXED_BOTTOM_OFFSET = "--mobile-fixed-bottom-offset"

export function useMobileViewportOffset() {
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0

    const writeOffset = () => {
      frame = 0
      const currentViewport = window.visualViewport
      const bottomOffset = currentViewport ? Math.max(0, window.innerHeight - currentViewport.height - currentViewport.offsetTop) : 0
      root.style.setProperty(MOBILE_FIXED_BOTTOM_OFFSET, `${Math.round(bottomOffset)}px`)
    }

    const scheduleWrite = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(writeOffset)
    }

    writeOffset()
    window.addEventListener("resize", scheduleWrite)
    window.addEventListener("orientationchange", scheduleWrite)
    viewport?.addEventListener("resize", scheduleWrite)
    viewport?.addEventListener("scroll", scheduleWrite)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", scheduleWrite)
      window.removeEventListener("orientationchange", scheduleWrite)
      viewport?.removeEventListener("resize", scheduleWrite)
      viewport?.removeEventListener("scroll", scheduleWrite)
      root.style.removeProperty(MOBILE_FIXED_BOTTOM_OFFSET)
    }
  }, [])
}
