import { lazy, Suspense, useState, useEffect } from "react"
import { Archive, ChevronDown, Database, Download, Grid2X2, Home, List, LogOut, Menu, PieChart, Plus, Search, Upload, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getActiveCount, setBridgeFilters, toggleFilterValue, useFilterSnapshot } from "./closet/filterBridge"
import {
  CategoryPicker,
  CategoryRail,
  CategoryTab,
  ColorOptionGrid,
  FilterSection,
  LegacyFilterBridges,
  OptionList,
  RatingOptionList,
  RailActions,
  SheetFilterPanel,
  TopCategoryNav,
} from "./closet/FilterControls"
import { FILTER_TABS, SORT_OPTIONS, type FilterKey } from "./closet/filterTypes"
import { useLegacyClosetRuntime } from "./closet/useLegacyClosetRuntime"

const ClosetDetailDialog = lazy(() =>
  import("./ClosetDetailDialog").then((module) => ({ default: module.ClosetDetailDialog }))
)

const AnalysisPage = lazy(() => import("./AnalysisPage"))

function App() {
  useLegacyClosetRuntime()

  const snapshot = useFilterSnapshot()
  const [activePage, setActivePage] = useState<"closet" | "analysis">(() => {
    return window.location.pathname === "/analysis" ? "analysis" : "closet"
  })
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeSheetTab, setActiveSheetTab] = useState<FilterKey>("colors")
  const isLoading = snapshot.loading

  useEffect(() => {
    const handlePopState = () => {
      const isAnalysis = window.location.pathname === "/analysis";
      setActivePage(isAnalysis ? "analysis" : "closet");
      if (!isAnalysis) {
        window.dispatchEvent(new Event("closet:filters-change"));
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const navigateTo = (page: "closet" | "analysis") => {
    if (activePage === page) return
    setActivePage(page)
    window.history.pushState({}, "", page === "analysis" ? "/analysis" : "/")
    if (page === "closet") {
      window.dispatchEvent(new Event("closet:filters-change"));
    }
  }

  const selectedParentLabel = snapshot.filters.parentCategory === "all" ? "전체" : snapshot.filters.parentCategory
  const selectedChildLabel = snapshot.filters.childCategory === "all" ? "전체" : snapshot.filters.childCategory
  const resultTitle = selectedChildLabel === "전체" ? (selectedParentLabel === "전체" ? "제품" : selectedParentLabel) : selectedChildLabel

  const openSheet = (tab: FilterKey) => {
    setActiveSheetTab(tab)
    setSheetOpen(true)
  }

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
	            <h1>옷장</h1>
	          </div>
          <TopCategoryNav snapshot={snapshot} activePage={activePage} setActivePage={navigateTo} />
          
          <label className="topbar-search desktop-only-search">
            <Search className="size-4" />
            <Input
              id="desktopSearchInput"
              type="search"
              value={snapshot.filters.query}
              placeholder="제품명, 브랜드, 색상"
              onChange={(event) => setBridgeFilters({ query: event.target.value })}
            />
          </label>

          <div className="topbar-actions">
            <Button
              id="logoutButton"
              className="topbar-icon-action auth-logout-button"
              data-action="logout"
              type="button"
              variant="outline"
              aria-label="로그아웃"
              title="로그아웃"
              hidden
            >
              <LogOut className="size-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="topbar-icon-action" type="button" variant="outline" aria-label="가져오기">
                  <Upload className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="topbar-action-menu" align="end">
                <button data-action="import-csv" type="button">
                  <Upload className="size-4" />
                  CSV 가져오기
                </button>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="topbar-icon-action" type="button" variant="outline" aria-label="내보내기">
                  <Download className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="topbar-action-menu" align="end">
                <button data-action="export-csv" type="button">
                  <Download className="size-4" />
                  CSV 내보내기
                </button>
                <button data-action="export-json" type="button">
                  <Database className="size-4" />
                  JSON 백업
                </button>
                <button data-action="export-zip" type="button">
                  <Archive className="size-4" />
                  이미지 포함 ZIP 백업
                </button>
              </PopoverContent>
            </Popover>
            <Button className="button primary" data-action="new-item" type="button" aria-label="새 제품">
              <Plus className="size-4" />
              <span className="new-item-label">새 제품</span>
            </Button>
          </div>
        </header>

        <main className="workspace" style={{ display: activePage === "closet" ? undefined : "none" }}>
          <aside className="filters" aria-label="카테고리와 필터">
            <div className="desktop-filter-rail">
              <div className="desktop-filter-scroll">
                <CategoryRail snapshot={snapshot} />
                <Separator className="filter-separator" />
                <div className="rail-section-heading">
                  <span>필터</span>
                </div>
                <FilterSection title="색상">
                  <ColorOptionGrid snapshot={snapshot} compact={false} />
                </FilterSection>
                <FilterSection title="가격대">
                  <OptionList
                    values={snapshot.options.priceRanges}
                    selected={snapshot.filters.priceRanges}
                    onToggle={(value) => toggleFilterValue("priceRanges", value, snapshot)}
                  />
                </FilterSection>
                <FilterSection title="상태">
                  <OptionList
                    className="two-column-option-list"
                    values={snapshot.options.owned}
                    selected={snapshot.filters.owned}
                    onToggle={(value) => toggleFilterValue("owned", value, snapshot)}
                  />
                </FilterSection>
                <FilterSection title="브랜드" className="brand-filter-section" scroll>
                  <SheetFilterPanel tab="brands" snapshot={snapshot} />
                </FilterSection>
                <FilterSection title="평점" className="rating-filter-section">
                  <RatingOptionList snapshot={snapshot} />
                </FilterSection>
              </div>
              <RailActions />
            </div>

            <div className="mobile-filter-surface">
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button className="mobile-category-button" type="button" variant="ghost">
                    <span>{selectedParentLabel}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="mobile-category-popover" align="start">
                  <CategoryPicker snapshot={snapshot} onPick={() => setCategoryOpen(false)} />
                </PopoverContent>
              </Popover>

              <div className="mobile-child-tabs" aria-label={`${selectedParentLabel} 하위 카테고리`}>
                <CategoryTab label="전체" active={snapshot.filters.childCategory === "all"} onClick={() => setBridgeFilters({ childCategory: "all" })} />
                {snapshot.options.childCategories.map((category) => (
                  <CategoryTab
                    key={category}
                    label={category}
                    active={snapshot.filters.childCategory === category}
                    onClick={() => setBridgeFilters({ childCategory: category })}
                  />
                ))}
              </div>

              <div className="mobile-filter-chips" aria-label="필터">
                {FILTER_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    className={`filter-chip-button ${getActiveCount(snapshot, tab.key) ? "is-active" : ""}`}
                    type="button"
                    variant="outline"
                    onClick={() => openSheet(tab.key)}
                  >
                    {tab.label}
                    {getActiveCount(snapshot, tab.key) ? <span>{getActiveCount(snapshot, tab.key)}</span> : null}
                  </Button>
                ))}
              </div>
            </div>

            <LegacyFilterBridges />
          </aside>

          <section className={`content ${isLoading ? "is-loading" : ""}`} aria-label="옷장 목록">
            <div className="content-toolbar">
              <label className="content-search mobile-only-search">
                <Search className="size-4" />
                <Input
                  id="searchInput"
                  type="search"
                  value={snapshot.filters.query}
                  placeholder="제품명, 브랜드, 색상"
                  onChange={(event) => setBridgeFilters({ query: event.target.value })}
                />
              </label>
              <div className="result-heading">
                <h2 id="resultTitle">{resultTitle}</h2>
                <p id="resultCount">{snapshot.visibleCount}개</p>
              </div>
              <Select value={snapshot.filters.sort} onValueChange={(sort) => setBridgeFilters({ sort })}>
                <SelectTrigger className="toolbar-select" aria-label="정렬">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="shadcn-select-content toolbar-select-content" position="popper">
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToggleGroup className="view-toggle" type="single" defaultValue="grid" aria-label="보기 방식">
                <ToggleGroupItem className="view-button" value="grid" data-view="grid" type="button">
                  <Grid2X2 className="size-4" />
                  격자
                </ToggleGroupItem>
                <ToggleGroupItem className="view-button" value="list" data-view="list" type="button">
                  <List className="size-4" />
                  목록
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="content-loading" role="status" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <strong>제품을 불러오는 중</strong>
            </div>
            <div id="itemList" className="item-grid" />
            <Card id="emptyState" className="empty-state" hidden>
              <CardContent className="empty-state-content">
                <h2>표시할 제품이 없습니다</h2>
                <p>필터를 조정하거나 우측 상단 가져오기 메뉴를 사용하세요.</p>
              </CardContent>
            </Card>
          </section>

          <aside id="detailPanel" className="detail-panel-bridge" hidden />
        </main>

        {activePage === "analysis" && (
          <Suspense fallback={<div className="content-loading" style={{ height: "100vh" }}><span className="loading-spinner" /></div>}>
            <AnalysisPage />
          </Suspense>
        )}
      </div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="filter-sheet" showCloseButton={false}>
          <DialogHeader className="filter-sheet-header">
            <DialogTitle>필터</DialogTitle>
            <Button className="icon-button" type="button" variant="ghost" aria-label="닫기" onClick={() => setSheetOpen(false)}>
              <X className="size-5" />
            </Button>
          </DialogHeader>
          <div className="sheet-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                className={activeSheetTab === tab.key ? "active" : ""}
                type="button"
                onClick={() => setActiveSheetTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ScrollArea className="sheet-scroll">
            <div className="sheet-filter-body">
              <SheetFilterPanel tab={activeSheetTab} snapshot={snapshot} />
            </div>
          </ScrollArea>
          <RailActions onView={() => setSheetOpen(false)} />
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <ClosetDetailDialog />
      </Suspense>

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
          <p className="dialog-copy">Google 계정으로 로그인하면 PC와 모바일에서 같은 옷장을 사용할 수 있습니다.</p>
          <Button className="button primary full" type="submit">
            Google로 계속하기
          </Button>
        </form>
      </dialog>

      <div id="toast" className="toast" role="status" aria-live="polite" />

      <nav className="mobile-bottom-nav">
        <button className={`nav-item ${activePage === "closet" ? "active" : ""}`} type="button" onClick={() => {
          navigateTo("closet");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          <Home className="size-6" />
          <span>홈</span>
        </button>
        <button className="nav-item" type="button" onClick={() => {
          navigateTo("closet");
          setCategoryOpen(!categoryOpen);
        }}>
          <Menu className="size-6" />
          <span>카테고리</span>
        </button>
        <button className="nav-item" type="button" onClick={() => {
          navigateTo("closet");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => document.getElementById("searchInput")?.focus(), 100);
        }}>
          <Search className="size-6" />
          <span>검색</span>
        </button>
        <button className={`nav-item ${activePage === "analysis" ? "active" : ""}`} type="button" onClick={() => {
          navigateTo("analysis");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          <PieChart className="size-6" />
          <span>분석</span>
        </button>
        <button className="nav-item" type="button" onClick={() => {
          const dialog = document.getElementById("authDialog") as HTMLDialogElement;
          dialog?.showModal();
        }}>
          <User className="size-6" />
          <span>마이</span>
        </button>
      </nav>
    </>
  )
}

export default App
