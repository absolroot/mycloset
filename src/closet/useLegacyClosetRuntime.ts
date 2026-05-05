import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import backupUtilsUrl from "../../assets/js/closet-backup-utils.js?url"
import categoryUtilsUrl from "../../assets/js/closet-category-utils.js?url"
import csvUtilsUrl from "../../assets/js/closet-csv-utils.js?url"
import exportUtilsUrl from "../../assets/js/closet-export-utils.js?url"
import filterUtilsUrl from "../../assets/js/closet-filter-utils.js?url"
import formUtilsUrl from "../../assets/js/closet-form-utils.js?url"
import formatUtilsUrl from "../../assets/js/closet-format-utils.js?url"
import guestMergeUtilsUrl from "../../assets/js/closet-guest-merge-utils.js?url"
import guestSampleUtilsUrl from "../../assets/js/closet-guest-sample-utils.js?url"
import imageUtilsUrl from "../../assets/js/closet-image-utils.js?url"
import imageProviderUtilsUrl from "../../assets/js/closet-image-provider-utils.js?url"
import imageStateUtilsUrl from "../../assets/js/closet-image-state-utils.js?url"
import itemUtilsUrl from "../../assets/js/closet-item-utils.js?url"
import measurementUtilsUrl from "../../assets/js/closet-measurement-utils.js?url"
import renderUtilsUrl from "../../assets/js/closet-render-utils.js?url"
import storageUtilsUrl from "../../assets/js/closet-storage-utils.js?url"
import supabaseUtilsUrl from "../../assets/js/closet-supabase-utils.js?url"
import legacyAppUrl from "../../assets/js/app.js?url"
import defaultGuestCsvUrl from "../../assets/temp/Closet 137abb41507c80699008e26e88fa26d9_all (2).csv?url"
import appleWatchSampleImageUrl from "../../assets/temp/f_005fc5.webp?url"
import newBalanceSampleImageUrl from "../../assets/temp/-3.webp?url"
import uniqloShirtSampleImageUrl from "../../assets/temp/f_005fd1.webp?url"

const guestSampleImageUrls = [
  newBalanceSampleImageUrl,
  appleWatchSampleImageUrl,
  uniqloShirtSampleImageUrl,
]

declare global {
  interface Window {
    __closetLegacyLoaded?: boolean
    WARDROBE_CONFIG?: {
      imageStorage?: {
        bucket?: string
        provider?: string
        signedUrlExpiresInSeconds?: number
      }
      supabaseUrl?: string
      supabaseAnonKey?: string
    }
    WARDROBE_SUPABASE_CREATE_CLIENT?: typeof createClient
    WARDROBE_DEFAULT_CSV_URL?: string
    WARDROBE_GUEST_SAMPLE_IMAGE_URLS?: string[]
    WARDROBE_INTERNAL_DEMO_ENABLED?: boolean
    WARDROBE_TEMP_IMAGE_URLS?: string[]
  }
}

export function useLegacyClosetRuntime() {
  useEffect(() => {
    if (window.__closetLegacyLoaded) return
    window.__closetLegacyLoaded = true
    window.WARDROBE_SUPABASE_CREATE_CLIENT = createClient
    window.WARDROBE_DEFAULT_CSV_URL = defaultGuestCsvUrl
    window.WARDROBE_GUEST_SAMPLE_IMAGE_URLS = guestSampleImageUrls
    window.WARDROBE_INTERNAL_DEMO_ENABLED = import.meta.env.DEV
    window.WARDROBE_TEMP_IMAGE_URLS = guestSampleImageUrls

    const envConfig = {
      imageStorage: {
        provider: import.meta.env.VITE_IMAGE_STORAGE_PROVIDER,
        bucket: import.meta.env.VITE_IMAGE_STORAGE_BUCKET,
        signedUrlExpiresInSeconds: Number(import.meta.env.VITE_SIGNED_IMAGE_URL_EXPIRES_IN_SECONDS || 3600),
      },
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }

    const legacyScripts = [
      { src: formatUtilsUrl, name: "closetFormatUtils" },
      { src: csvUtilsUrl, name: "closetCsvUtils" },
      { src: categoryUtilsUrl, name: "closetCategoryUtils" },
      { src: filterUtilsUrl, name: "closetFilterUtils" },
      { src: formUtilsUrl, name: "closetFormUtils" },
      { src: guestSampleUtilsUrl, name: "closetGuestSampleUtils" },
      { src: guestMergeUtilsUrl, name: "closetGuestMergeUtils" },
      { src: imageUtilsUrl, name: "closetImageUtils" },
      { src: imageProviderUtilsUrl, name: "closetImageProviderUtils" },
      { src: imageStateUtilsUrl, name: "closetImageStateUtils" },
      { src: measurementUtilsUrl, name: "closetMeasurementUtils" },
      { src: itemUtilsUrl, name: "closetItemUtils" },
      { src: renderUtilsUrl, name: "closetRenderUtils" },
      { src: storageUtilsUrl, name: "closetStorageUtils" },
      { src: supabaseUtilsUrl, name: "closetSupabaseUtils" },
      { src: exportUtilsUrl, name: "closetExportUtils" },
      { src: backupUtilsUrl, name: "closetBackupUtils" },
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
