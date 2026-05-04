import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import categoryUtilsUrl from "../../assets/js/closet-category-utils.js?url"
import csvUtilsUrl from "../../assets/js/closet-csv-utils.js?url"
import exportUtilsUrl from "../../assets/js/closet-export-utils.js?url"
import filterUtilsUrl from "../../assets/js/closet-filter-utils.js?url"
import formatUtilsUrl from "../../assets/js/closet-format-utils.js?url"
import imageUtilsUrl from "../../assets/js/closet-image-utils.js?url"
import measurementUtilsUrl from "../../assets/js/closet-measurement-utils.js?url"
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

    const legacyScripts = [
      { src: formatUtilsUrl, name: "closetFormatUtils" },
      { src: csvUtilsUrl, name: "closetCsvUtils" },
      { src: categoryUtilsUrl, name: "closetCategoryUtils" },
      { src: filterUtilsUrl, name: "closetFilterUtils" },
      { src: imageUtilsUrl, name: "closetImageUtils" },
      { src: measurementUtilsUrl, name: "closetMeasurementUtils" },
      { src: exportUtilsUrl, name: "closetExportUtils" },
      { src: legacyAppUrl, name: "legacyCloset" },
    ]

    const loadLegacyScripts = (index = 0) => {
      const item = legacyScripts[index]
      if (!item) return

      const script = document.createElement("script")
      script.src = item.src
      script.defer = true
      script.dataset[item.name] = "true"
      script.onload = () => loadLegacyScripts(index + 1)
      script.onerror = () => loadLegacyScripts(index + 1)
      document.body.append(script)
    }

    if (envConfig.supabaseUrl && envConfig.supabaseAnonKey) {
      window.WARDROBE_CONFIG = envConfig
      loadLegacyScripts()
      return
    }

    const configScript = document.createElement("script")
    configScript.src = `${import.meta.env.BASE_URL}config.js?v=4`
    configScript.onload = () => loadLegacyScripts()
    configScript.onerror = () => loadLegacyScripts()
    document.body.append(configScript)
  }, [])
}
