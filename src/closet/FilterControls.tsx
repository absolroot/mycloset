import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { colorToHex, SORT_OPTIONS, type FilterKey, type FilterOption, type FilterSnapshot } from "./filterTypes"
import { getFilterBridge, setBridgeFilters, toggleFilterValue } from "./filterBridge"

export function TopCategoryNav({
  snapshot,
  activePage,
  setActivePage,
}: {
  snapshot: FilterSnapshot
  activePage: "closet" | "analysis"
  setActivePage: (page: "closet" | "analysis") => void
}) {
  return (
    <nav className="desktop-parent-category-nav" aria-label="상위 카테고리">
      <button
        className={activePage === "closet" && snapshot.filters.parentCategory === "all" ? "active" : ""}
        type="button"
        onClick={() => {
          setActivePage("closet")
          setBridgeFilters({ parentCategory: "all", childCategory: "all" })
        }}
      >
        전체
      </button>
      {snapshot.options.parentCategories.map((category) => (
        <button
          key={category}
          className={activePage === "closet" && snapshot.filters.parentCategory === category ? "active" : ""}
          type="button"
          onClick={() => {
            setActivePage("closet")
            setBridgeFilters({ parentCategory: category, childCategory: "all" })
          }}
        >
          {category}
        </button>
      ))}
      <div className="nav-separator" aria-hidden="true" />
      <button
        className={activePage === "analysis" ? "active" : ""}
        type="button"
        onClick={() => setActivePage("analysis")}
      >
        분석
      </button>
    </nav>
  )
}

export function CategoryRail({ snapshot }: { snapshot: FilterSnapshot }) {
  const parentLabel = snapshot.filters.parentCategory === "all" ? "전체" : snapshot.filters.parentCategory

  return (
    <div className="category-rail">
      <div className="rail-section-heading">
        <span>하위 카테고리</span>
        <small>{parentLabel}</small>
      </div>
      <div className="child-category-list">
        <CategoryTab
          label="전체"
          active={snapshot.filters.childCategory === "all"}
          onClick={() => setBridgeFilters({ childCategory: "all" })}
        />
        {snapshot.options.childCategories.map((category) => (
          <CategoryTab
            key={category}
            label={category}
            active={snapshot.filters.childCategory === category}
            onClick={() => setBridgeFilters({ childCategory: category })}
          />
        ))}
      </div>
    </div>
  )
}

export function CategoryPicker({ snapshot, onPick }: { snapshot: FilterSnapshot; onPick: () => void }) {
  const pick = (parentCategory: string) => {
    setBridgeFilters({ parentCategory, childCategory: "all" })
    onPick()
  }

  return (
    <div className="category-picker">
      <button className={snapshot.filters.parentCategory === "all" ? "active" : ""} type="button" onClick={() => pick("all")}>
        전체
      </button>
      {snapshot.options.parentCategories.map((category) => (
        <button
          key={category}
          className={snapshot.filters.parentCategory === category ? "active" : ""}
          type="button"
          onClick={() => pick(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}

export function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`category-tab ${active ? "active" : ""}`} type="button" onClick={onClick}>
      {label}
    </button>
  )
}

export function FilterSection({
  title,
  children,
  className = "",
  scroll = false,
}: {
  title: string
  children: ReactNode
  className?: string
  scroll?: boolean
}) {
  return (
    <section className={`rail-filter-section ${scroll ? "is-scrollable" : ""} ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function OptionList({
  values,
  selected,
  onToggle,
  className = "",
}: {
  values: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
  className?: string
}) {
  if (!values.length) return <p className="filter-empty">옵션 없음</p>

  return (
    <div className={`check-option-list ${className}`}>
      {values.map((option) => (
        <button key={option.id} className={selected.includes(option.id) ? "active" : ""} type="button" onClick={() => onToggle(option.id)}>
          <span className="checkmark" aria-hidden="true" />
          <span className="option-label">
            <span>{option.label}</span>
            {typeof option.count === "number" ? <span className="option-count">({option.count})</span> : null}
          </span>
        </button>
      ))}
    </div>
  )
}

export function RatingOptionList({ snapshot }: { snapshot: FilterSnapshot }) {
  return (
    <OptionList
      className="rating-option-list"
      values={snapshot.options.rating}
      selected={snapshot.filters.ratings}
      onToggle={(value) => toggleFilterValue("rating", value, snapshot)}
    />
  )
}

export function ColorOptionGrid({ snapshot, compact }: { snapshot: FilterSnapshot; compact: boolean }) {
  const values = snapshot.options.colors.map((color) => ({ id: color, label: color }))
  if (!values.length) return <p className="filter-empty">옵션 없음</p>

  return (
    <div className={compact ? "color-option-grid compact" : "color-option-grid"}>
      {values.map((option) => (
        <button
          key={option.id}
          className={snapshot.filters.colors.includes(option.id) ? "active" : ""}
          type="button"
          onClick={() => toggleFilterValue("colors", option.id, snapshot)}
        >
          <span className="color-dot" style={{ "--dot": colorToHex(option.id) } as CSSProperties} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function BrandOptionList({ snapshot }: { snapshot: FilterSnapshot }) {
  const [brandQuery, setBrandQuery] = useState("")
  const query = brandQuery.trim().toLocaleLowerCase("ko-KR")
  const brands = useMemo(
    () =>
      snapshot.options.brands
        .map((brand) => ({ id: brand, label: brand, count: snapshot.options.brandCounts?.[brand] ?? 0 }))
        .filter((brand) => !query || brand.label.toLocaleLowerCase("ko-KR").includes(query)),
    [query, snapshot.options.brandCounts, snapshot.options.brands]
  )

  if (snapshot.loading) {
    return <BrandFilterLoading />
  }

  return (
    <div className="brand-filter-panel">
      <label className="brand-filter-search">
        <Search className="size-4" />
        <Input className="brand-filter-input" value={brandQuery} type="search" placeholder="브랜드 검색" onChange={(event) => setBrandQuery(event.target.value)} />
      </label>
      <div className="brand-filter-meta">
        <span>{brands.length}개 브랜드</span>
        {snapshot.filters.brands.length ? <strong>{snapshot.filters.brands.length}개 선택</strong> : null}
      </div>
      <OptionList values={brands} selected={snapshot.filters.brands} onToggle={(value) => toggleFilterValue("brands", value, snapshot)} />
    </div>
  )
}

function BrandFilterLoading() {
  return (
    <div className="brand-filter-panel is-loading" aria-label="브랜드 불러오는 중">
      <div className="brand-filter-search brand-filter-search-skeleton">
        <Search className="size-4" />
        <span />
      </div>
      <div className="brand-filter-meta">
        <span>브랜드 불러오는 중</span>
      </div>
      <div className="brand-filter-skeleton-list" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function SheetFilterPanel({ tab, snapshot }: { tab: FilterKey; snapshot: FilterSnapshot }) {
  if (tab === "colors") return <ColorOptionGrid snapshot={snapshot} compact />
  if (tab === "rating") return <RatingOptionList snapshot={snapshot} />
  if (tab === "priceRanges") {
    return (
      <OptionList
        values={snapshot.options.priceRanges}
        selected={snapshot.filters.priceRanges}
        onToggle={(value) => toggleFilterValue("priceRanges", value, snapshot)}
      />
    )
  }
  if (tab === "owned") {
    return (
      <OptionList
        values={snapshot.options.owned}
        selected={snapshot.filters.owned}
        onToggle={(value) => toggleFilterValue("owned", value, snapshot)}
      />
    )
  }
  return <BrandOptionList snapshot={snapshot} />
}

export function RailActions({ onView }: { onView?: () => void }) {
  return (
    <div className={`filter-rail-actions ${onView ? "with-view-action" : ""}`}>
      <Button className="button secondary" type="button" variant="outline" onClick={() => getFilterBridge()?.resetFilters?.()}>
        초기화
      </Button>
      {onView ? (
        <Button className="button primary" type="button" onClick={onView}>
          결과 보기
        </Button>
      ) : null}
    </div>
  )
}

export function LegacyFilterBridges() {
  return (
    <div className="legacy-filter-bridges" aria-hidden="true">
      <select id="categoryFilter" tabIndex={-1} />
      <select id="brandFilter" tabIndex={-1} />
      <select id="colorFilter" tabIndex={-1} />
      <select id="sortFilter" tabIndex={-1} defaultValue="category">
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Input id="csvFileInput" type="file" accept=".csv,text/csv" hidden />
    </div>
  )
}
