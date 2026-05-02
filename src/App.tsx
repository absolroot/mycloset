import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { createClient } from "@supabase/supabase-js"
import { ChevronDown, Database, Download, Grid2X2, List, Plus, SlidersHorizontal, Upload, X } from "lucide-react"
import legacyAppUrl from "../assets/js/app.js?url"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ClosetDetailDialog } from "./ClosetDetailDialog"

declare global {
  interface Window {
    __closetLegacyLoaded?: boolean
    WARDROBE_CONFIG?: {
      supabaseUrl?: string
      supabaseAnonKey?: string
    }
    WARDROBE_SUPABASE_CREATE_CLIENT?: typeof createClient
  }
}

function App() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (window.__closetLegacyLoaded) return
    window.__closetLegacyLoaded = true
    window.WARDROBE_SUPABASE_CREATE_CLIENT = createClient

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

    if (envConfig.supabaseUrl && envConfig.supabaseAnonKey) {
      window.WARDROBE_CONFIG = envConfig
      loadLegacyApp()
      return
    }

    const configScript = document.createElement("script")
    configScript.src = `${import.meta.env.BASE_URL}config.js?v=4`
    configScript.onload = loadLegacyApp
    configScript.onerror = loadLegacyApp
    document.body.append(configScript)
  }, [])

  return (
    <>
      <section id="shareView" className="share-view" hidden>
        <header className="share-header">
          <p className="eyebrow">Shared Closet</p>
          <h1 id="shareTitle">공유된 옷장</h1>
        </header>
        <main id="shareItems" className="share-grid" />
      </section>

      <div id="appShell" className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <Badge variant="secondary" className="eyebrow-badge">
              Closet
            </Badge>
            <h1>옷장</h1>
          </div>
          <div className="topbar-actions">
            <Button className="button secondary" id="syncButton" type="button" variant="outline">
              로컬 저장
            </Button>
            <Button className="button primary" data-action="new-item" type="button">
              <Plus className="size-4" />
              새 제품
            </Button>
          </div>
        </header>

        <main className="workspace">
          <aside className={`filters ${filtersOpen ? "is-open" : ""}`} aria-label="필터">
            <Button
              className="filter-toggle"
              type="button"
              variant="ghost"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="size-4" />
              <span>검색과 필터</span>
              <ChevronDown className="size-4 filter-toggle-chevron" />
            </Button>
            <ScrollArea className="filters-scroll">
              <div className="filters-inner">
                <Label className="field search-field">
                  <span>검색</span>
                  <Input id="searchInput" type="search" placeholder="제품명, 브랜드, 색상" />
                </Label>

                <FilterSelect id="categoryFilter" label="상위 카테고리" />
                <FilterSelect id="brandFilter" label="브랜드" />
                <FilterSelect id="colorFilter" label="색상" />

                <div className="filter-block">
                  <span className="filter-label">상태</span>
                  <ToggleGroup className="segmented" type="single" defaultValue="all" aria-label="보유 상태">
                    <ToggleGroupItem className="segment active" value="all" data-owned="all" type="button">
                      전체
                    </ToggleGroupItem>
                    <ToggleGroupItem className="segment" value="owned" data-owned="owned" type="button">
                      보유
                    </ToggleGroupItem>
                    <ToggleGroupItem className="segment" value="archived" data-owned="archived" type="button">
                      정리
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <BridgeSelect id="sortFilter" label="정렬">
                  <option value="updated">최근 수정</option>
                  <option value="purchaseDate">구매일</option>
                  <option value="priceDesc">구매가 높은순</option>
                  <option value="name">이름순</option>
                </BridgeSelect>

                <Separator className="filter-separator" />

                <div className="filter-actions">
                  <Button className="button secondary" data-action="import-csv" type="button" variant="outline">
                    <Upload className="size-4" />
                    CSV 가져오기
                  </Button>
                  <Button className="button secondary" data-action="export-csv" type="button" variant="outline">
                    <Download className="size-4" />
                    CSV 내보내기
                  </Button>
                  <Button className="button secondary" data-action="export-json" type="button" variant="outline">
                    <Database className="size-4" />
                    JSON 백업
                  </Button>
                </div>
                <Input id="csvFileInput" type="file" accept=".csv,text/csv" hidden />
              </div>
            </ScrollArea>
          </aside>

          <section className="content" aria-label="옷장 목록">
            <div className="summary-row" id="summaryRow" />

            <div className="content-toolbar">
              <div>
                <h2 id="resultTitle">제품</h2>
                <p id="resultCount">0개</p>
              </div>
              <ToggleGroup className="view-toggle" type="single" defaultValue="grid" aria-label="보기 방식">
                <ToggleGroupItem className="view-button active" value="grid" data-view="grid" type="button">
                  <Grid2X2 className="size-4" />
                  격자
                </ToggleGroupItem>
                <ToggleGroupItem className="view-button" value="list" data-view="list" type="button">
                  <List className="size-4" />
                  목록
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div id="itemList" className="item-grid" />
            <Card id="emptyState" className="empty-state" hidden>
              <CardContent className="empty-state-content">
                <h2>표시할 제품이 없습니다</h2>
                <p>필터를 조정하거나 CSV를 다시 가져오세요.</p>
                <Button className="button primary" data-action="import-csv" type="button">
                  <Upload className="size-4" />
                  CSV 가져오기
                </Button>
              </CardContent>
            </Card>
          </section>

          <aside id="detailPanel" className="detail-panel-bridge" hidden />
        </main>
      </div>

      <ClosetDetailDialog />

      <dialog id="authDialog" className="dialog">
        <form id="authForm" method="dialog">
          <header className="dialog-header">
            <h2>Supabase 동기화</h2>
            <Button
              aria-label="닫기"
              className="icon-button"
              type="button"
              variant="ghost"
              onClick={(event) => event.currentTarget.closest("dialog")?.close()}
            >
              <X className="size-5" />
            </Button>
          </header>
          <p className="dialog-copy">이메일 링크로 로그인하면 PC와 모바일에서 같은 옷장을 사용할 수 있습니다.</p>
          <Label className="field">
            <span>이메일</span>
            <Input id="authEmail" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Label>
          <Button className="button primary full" type="submit">
            로그인 링크 받기
          </Button>
        </form>
      </dialog>

      <div id="toast" className="toast" role="status" aria-live="polite" />
    </>
  )
}

function FilterSelect({ id, label }: { id: string; label: string }) {
  return <BridgeSelect id={id} label={label} />
}

type BridgeOption = {
  disabled: boolean
  label: string
  value: string
}

const BRIDGE_EMPTY_VALUE = "__closet_select_empty__"
const BRIDGE_PENDING_VALUE = "__closet_select_pending__"
const COLOR_MAP: Record<string, string> = {
  블랙: "#202124",
  화이트: "#ffffff",
  브라운: "#795548",
  베이지: "#d8c4a3",
  네이비: "#243b64",
  블루: "#1a73e8",
  "그레이/실버": "#c4c7c5",
  그린: "#188038",
  카키: "#7d8460",
  레드: "#c5221f",
  와인: "#7b1f32",
  핑크: "#f4a6b8",
  옐로우: "#fbbc04",
  오렌지: "#f29900",
  골드: "#c6a15b",
}

function optionValueToSelectValue(value: string) {
  return value === "" ? BRIDGE_EMPTY_VALUE : value
}

function selectValueToOptionValue(value: string) {
  return value === BRIDGE_EMPTY_VALUE ? "" : value
}

function readBridgeOptions(select: HTMLSelectElement): BridgeOption[] {
  return Array.from(select.options).map((option) => ({
    disabled: option.disabled,
    label: option.textContent || option.label || option.value,
    value: option.value,
  }))
}

function normalizeColorName(value: string) {
  const first = String(value || "").split(/[,，]/)[0]?.trim() || ""
  if (first === "그레이" || first === "실버") return "그레이/실버"
  return first
}

function colorToHex(color: string) {
  const value = normalizeColorName(color)
  const direct = COLOR_MAP[value]
  if (direct) return direct
  const found = Object.keys(COLOR_MAP).find((key) => value.includes(key))
  return found ? COLOR_MAP[found] : "#c4c7c5"
}

function ColorOptionLabel({ label }: { label: string }) {
  return (
    <span className="select-color-option">
      <span className="color-dot" style={{ "--dot": colorToHex(label) } as CSSProperties} />
      <span>{label}</span>
    </span>
  )
}

function BridgeSelect({ id, label, children }: { id: string; label: string; children?: ReactNode }) {
  const [options, setOptions] = useState<BridgeOption[]>([])
  const [value, setValue] = useState("")
  const selectValue = options.length ? optionValueToSelectValue(value) : BRIDGE_PENDING_VALUE

  useEffect(() => {
    const nativeSelect = document.getElementById(id) as HTMLSelectElement | null
    if (!nativeSelect) return

    const syncFromNative = () => {
      setOptions(readBridgeOptions(nativeSelect))
      setValue(nativeSelect.value)
    }

    syncFromNative()

    const observer = new MutationObserver(syncFromNative)
    observer.observe(nativeSelect, {
      attributes: true,
      childList: true,
      subtree: true,
    })

    nativeSelect.addEventListener("change", syncFromNative)

    return () => {
      observer.disconnect()
      nativeSelect.removeEventListener("change", syncFromNative)
    }
  }, [id])

  const handleValueChange = (nextValue: string) => {
    if (nextValue === BRIDGE_PENDING_VALUE) return

    const nativeSelect = document.getElementById(id) as HTMLSelectElement | null
    if (!nativeSelect) return

    const optionValue = selectValueToOptionValue(nextValue)
    nativeSelect.value = optionValue
    setValue(optionValue)
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return (
    <div className="filter-block">
      <span className="filter-label">{label}</span>
      <select id={id} className="native-select-bridge" aria-hidden="true" tabIndex={-1} hidden>
        {children}
      </select>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger className="shadcn-select-trigger">
          <SelectValue placeholder="선택" />
        </SelectTrigger>
        <SelectContent className="shadcn-select-content" position="popper">
          {!options.length ? (
            <SelectItem value={BRIDGE_PENDING_VALUE} disabled>
              선택
            </SelectItem>
          ) : null}
          {options.map((option, index) => (
            <SelectItem
              key={`${option.value}-${option.label}-${index}`}
              value={optionValueToSelectValue(option.value)}
              disabled={option.disabled}
            >
              {id === "colorFilter" && option.value !== "all" ? <ColorOptionLabel label={option.label} /> : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default App
