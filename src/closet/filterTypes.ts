export type FilterKey = "colors" | "priceRanges" | "owned" | "brands"

export type FilterOption = {
  id: string
  label: string
}

export type ClosetFilters = {
  query: string
  parentCategory: string
  childCategory: string
  brands: string[]
  colors: string[]
  owned: string[]
  priceRanges: string[]
  sort: string
}

export type FilterSnapshot = {
  loading: boolean
  filters: ClosetFilters
  counts: {
    total: number
    visible: number
    owned: number
    archived: number
  }
  options: {
    parentCategories: string[]
    childCategories: string[]
    brands: string[]
    colors: string[]
    owned: FilterOption[]
    priceRanges: FilterOption[]
  }
  visibleCount: number
}

export type FilterBridge = {
  getFilterSnapshot: () => FilterSnapshot
  setFilters: (nextPartialFilters: Partial<ClosetFilters>) => void
  resetFilters: () => void
  subscribeFilters: (listener: (snapshot: FilterSnapshot) => void) => () => void
}

export const EMPTY_SNAPSHOT: FilterSnapshot = {
  loading: true,
  filters: {
    query: "",
    parentCategory: "all",
    childCategory: "all",
    brands: [],
    colors: [],
    owned: [],
    priceRanges: [],
    sort: "updated",
  },
  counts: {
    total: 0,
    visible: 0,
    owned: 0,
    archived: 0,
  },
  options: {
    parentCategories: [],
    childCategories: [],
    brands: [],
    colors: [],
    owned: [
      { id: "owned", label: "보유" },
      { id: "archived", label: "정리" },
    ],
    priceRanges: [
      { id: "none", label: "가격 없음" },
      { id: "under-50000", label: "5만원 이하" },
      { id: "50000-100000", label: "5만원~10만원" },
      { id: "100000-300000", label: "10만원~30만원" },
      { id: "300000-500000", label: "30만원~50만원" },
      { id: "over-500000", label: "50만원 이상" },
    ],
  },
  visibleCount: 0,
}

export const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "colors", label: "색상" },
  { key: "priceRanges", label: "가격대" },
  { key: "owned", label: "상태" },
  { key: "brands", label: "브랜드" },
]

export const SORT_OPTIONS = [
  { value: "updated", label: "최근 수정" },
  { value: "purchaseDate", label: "구매일" },
  { value: "priceDesc", label: "구매가 높은순" },
  { value: "name", label: "이름순" },
]

const COLOR_MAP: Record<string, string> = {
  블랙: "#202124",
  화이트: "#ffffff",
  브라운: "#795548",
  베이지: "#d8c4a3",
  네이비: "#243b64",
  블루: "#1a73e8",
  "블루/네이비": "linear-gradient(135deg, #1a73e8 0 50%, #243b64 50% 100%)",
  "그레이/실버": "#c4c7c5",
  그린: "#188038",
  올리브: "#7d8460",
  "올리브/그린": "linear-gradient(135deg, #7d8460 0 50%, #188038 50% 100%)",
  카키: "#7d8460",
  레드: "#c5221f",
  와인: "#7b1f32",
  버건디: "#7b1f32",
  퍼플: "#6f42c1",
  "와인/퍼플": "linear-gradient(135deg, #7b1f32 0 50%, #6f42c1 50% 100%)",
  핑크: "#f4a6b8",
  옐로우: "#fbbc04",
  오렌지: "#f29900",
  골드: "#c6a15b",
}

export function normalizeColorName(value: string) {
  const first = String(value || "").split(/[,／/]/)[0]?.trim() || ""
  if (first === "그레이" || first === "실버") return "그레이/실버"
  return first
}

export function colorToHex(color: string) {
  const value = normalizeColorName(color)
  const direct = COLOR_MAP[value]
  if (direct) return direct
  const found = Object.keys(COLOR_MAP).find((key) => value.includes(key))
  return found ? COLOR_MAP[found] : "#c4c7c5"
}
