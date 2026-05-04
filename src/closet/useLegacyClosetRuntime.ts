import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import csvUtilsUrl from "../../assets/js/closet-csv-utils.js?url"
import filterUtilsUrl from "../../assets/js/closet-filter-utils.js?url"
import formatUtilsUrl from "../../assets/js/closet-format-utils.js?url"
import imageUtilsUrl from "../../assets/js/closet-image-utils.js?url"
import legacyAppUrl from "../../assets/js/app.js?url"

const tempImageModules = import.meta.glob("../../assets/temp/*.{avif,gif,jpeg,jpg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>

const tempImageUrls = Object.entries(tempImageModules)
  .sort(([a], [b]) => a.localeCompare(b, "en"))
  .map(([, url]) => url)

declare global {
  interface Window {
    __closetLegacyLoaded?: boolean
    WARDROBE_CONFIG?: {
      supabaseUrl?: string
      supabaseAnonKey?: string
    }
    WARDROBE_SUPABASE_CREATE_CLIENT?: typeof createClient
    WARDROBE_TEMP_IMAGE_URLS?: string[]
  }
}

export function useLegacyClosetRuntime() {
  useEffect(() => {
    if (window.__closetLegacyLoaded) return
    window.__closetLegacyLoaded = true
    window.WARDROBE_SUPABASE_CREATE_CLIENT = createClient
    window.WARDROBE_TEMP_IMAGE_URLS = tempImageUrls

    const envConfig = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }

    const loadLegacyApp = () => {
      const script = document.createElement("script")
      script.src = legacyAppUrl
      script.defer = true
      script.dataset.legacyCloset = "true"
      document.body.append(script)
    }

    const loadImageUtils = () => {
      const script = document.createElement("script")
      script.src = imageUtilsUrl
      script.defer = true
      script.dataset.closetImageUtils = "true"
      script.onload = loadLegacyApp
      script.onerror = loadLegacyApp
      document.body.append(script)
    }

    const loadFilterUtils = () => {
      const script = document.createElement("script")
      script.src = filterUtilsUrl
      script.defer = true
      script.dataset.closetFilterUtils = "true"
      script.onload = loadImageUtils
      script.onerror = loadImageUtils
      document.body.append(script)
    }

    const loadCsvUtils = () => {
      const script = document.createElement("script")
      script.src = csvUtilsUrl
      script.defer = true
      script.dataset.closetCsvUtils = "true"
      script.onload = loadFilterUtils
      script.onerror = loadFilterUtils
      document.body.append(script)
    }

    const loadFormatUtils = () => {
      const script = document.createElement("script")
      script.src = formatUtilsUrl
      script.defer = true
      script.dataset.closetFormatUtils = "true"
      script.onload = loadCsvUtils
      script.onerror = loadCsvUtils
      document.body.append(script)
    }

    if (envConfig.supabaseUrl && envConfig.supabaseAnonKey) {
      window.WARDROBE_CONFIG = envConfig
      loadFormatUtils()
      return
    }

    const configScript = document.createElement("script")
    configScript.src = `${import.meta.env.BASE_URL}config.js?v=4`
    configScript.onload = loadFormatUtils
    configScript.onerror = loadFormatUtils
    document.body.append(configScript)
  }, [])
}
