export type FilterKey = "colors" | "priceRanges" | "owned" | "rating" | "brands"

export type FilterOption = {
  id: string
  label: string
  count?: number
}

export type ClosetFilters = {
  query: string
  parentCategory: string
  childCategory: string
  brands: string[]
  colors: string[]
  owned: string[]
  priceRanges: string[]
  ratings: string[]
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
    brandCounts: Record<string, number>
    colors: string[]
    owned: FilterOption[]
    priceRanges: FilterOption[]
    rating: FilterOption[]
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
    ratings: [],
    sort: "category",
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
    brandCounts: {},
    colors: [],
    owned: [
      { id: "owned", label: "보유" },
      { id: "archived", label: "정리" },
    ],
    priceRanges: [
      { id: "none", label: "0원" },
      { id: "under-50000", label: "5만원 이하" },
      { id: "50000-100000", label: "5만원~10만원" },
      { id: "100000-300000", label: "10만원~30만원" },
      { id: "300000-500000", label: "30만원~50만원" },
      { id: "over-500000", label: "50만원 이상" },
    ],
    rating: [
      { id: "5", label: "★★★★★" },
      { id: "4", label: "★★★★" },
      { id: "3", label: "★★★" },
      { id: "2", label: "★★" },
      { id: "1", label: "★" },
      { id: "unrated", label: "미평점" },
    ],
  },
  visibleCount: 0,
}

export const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "colors", label: "색상" },
  { key: "priceRanges", label: "가격대" },
  { key: "owned", label: "상태" },
  { key: "brands", label: "브랜드" },
  { key: "rating", label: "평점" },
]

export const SORT_OPTIONS = [
  { value: "category", label: "기본" },
  { value: "updated", label: "최근 수정" },
  { value: "purchaseDate", label: "구매일" },
  { value: "priceDesc", label: "구매가 높은순" },
  { value: "name", label: "이름순" },
]

export { colorToHex, normalizeColorName } from "./colorUtils"
