import { lazy, Suspense, useState, useEffect, type CSSProperties } from "react"
import { ArrowUp, CheckCircle2, ChevronRight, Circle, Grid2X2, Home, List, LogOut, Menu, PieChart, Plus, Search, Settings2, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getActiveCount, setBridgeFilters, toggleFilterValue, useFilterSnapshot } from "./closet/filterBridge"
import {
  CategoryRail,
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
import { BRAND_CONFIG } from "./brand/brandConfig"
import { LoginPage } from "./LoginPage"
import { useAuthSnapshot } from "./closet/authBridge"
import { getStarterBridge, useStarterSnapshot, type StarterSnapshot, type StarterStepKey } from "./closet/starterBridge"
import { useLegacyClosetRuntime } from "./closet/useLegacyClosetRuntime"
import { AppFooter } from "./legal/AppFooter"
import { ThemeToggle } from "./theme/ThemeToggle"
import { getPageFromPathname, getPathForPage, type AppPage } from "./appRoutes"

const ClosetDetailDialog = lazy(() =>
  import("./ClosetDetailDialog").then((module) => ({ default: module.ClosetDetailDialog }))
)

const AnalysisPage = lazy(() => import("./AnalysisPage"))
const AccountDeletionPage = lazy(() => import("./AccountDeletionPage").then((module) => ({ default: module.AccountDeletionPage })))
const MyPage = lazy(() => import("./MyPage").then((module) => ({ default: module.MyPage })))
const LegalPage = lazy(() => import("./legal/LegalPage").then((module) => ({ default: module.LegalPage })))

function PageLoading() {
  return (
    <div className="content-loading" style={{ height: "100vh" }} role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
    </div>
  )
}

function getPageFromPath(): AppPage {
  return getPageFromPathname(window.location.pathname)
}

function getAppScrollElement() {
  return document.querySelector<HTMLElement>("#appShell")
}

function getAppScrollTop() {
  return Math.max(window.scrollY, getAppScrollElement()?.scrollTop || 0)
}

function scrollAppToTop(behavior: ScrollBehavior = "smooth") {
  getAppScrollElement()?.scrollTo({ top: 0, behavior })
  window.scrollTo({ top: 0, behavior })
}

type DetailTitleItem = {
  brand?: string
  category?: string
  name?: string
  parentCategory?: string
}

type DetailTitlePayload = {
  item?: DetailTitleItem
}

function cleanTitlePart(value?: string) {
  return String(value || "").trim()
}

function buildDetailContextTitle(item?: DetailTitleItem) {
  if (!item) return ""
  const name = cleanTitlePart(item.name)
  const brand = cleanTitlePart(item.brand)
  const category = cleanTitlePart(item.category) || cleanTitlePart(item.parentCategory)
  const detail = [brand, category].filter(Boolean).join(" · ")
  if (name && detail) return `${name} · ${detail}`
  return name || detail
}

function StarterChecklist({
  snapshot,
  onNavigate,
}: {
  snapshot: StarterSnapshot
  onNavigate: (page: Extract<AppPage, "analysis" | "my">) => void
}) {
  if (!snapshot.visible) return null

  const handleStepAction = (key: StarterStepKey) => {
    const bridge = getStarterBridge()
    if (key === "sampleOpened") {
      bridge?.openFirstGuestSample?.()
      return
    }
    if (key === "itemSaved") {
      bridge?.createStarterItem?.()
      return
    }
    if (key === "analysisViewed") {
      bridge?.markStarterStep?.("analysisViewed")
      onNavigate("analysis")
      return
    }
    if (key === "myViewed") {
      bridge?.markStarterStep?.("myViewed")
      onNavigate("my")
    }
  }

  return (
    <section className="starter-checklist" aria-label="튜토리얼">
      <div className="starter-checklist-head">
        <div>
          <p className="eyebrow">튜토리얼</p>
          <h2>샘플을 보며 내 옷장 시작하기</h2>
        </div>
        <div className="starter-progress" aria-label={`${snapshot.completedCount}/${snapshot.totalCount} 완료`}>
          {snapshot.completedCount}/{snapshot.totalCount}
        </div>
      </div>
      <div className="starter-step-list">
        {snapshot.steps.map((step) => (
          <button
            key={step.key}
            className={`starter-step ${step.done ? "is-done" : ""}`}
            type="button"
            onClick={() => handleStepAction(step.key)}
          >
            {step.done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
            <span>
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </span>
            <ChevronRight className="size-4 starter-step-arrow" />
          </button>
        ))}
      </div>
      <button className="starter-dismiss" type="button" onClick={() => getStarterBridge()?.dismissStarterChecklist?.()}>
        숨기기
      </button>
    </section>
  )
}

function App() {
  useLegacyClosetRuntime()

  const snapshot = useFilterSnapshot()
  const auth = useAuthSnapshot()
  const starter = useStarterSnapshot()
  const [activePage, setActivePage] = useState<AppPage>(() => getPageFromPath())
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [myPageTab, setMyPageTab] = useState<"overview" | "settings">("overview")
  const [searchOpen, setSearchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeSheetTab, setActiveSheetTab] = useState<FilterKey>("colors")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [detailTitle, setDetailTitle] = useState("")
  const [analysisTitle, setAnalysisTitle] = useState("분석")
  const isLoading = snapshot.loading

  useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromPath()
      setActivePage(page)
      if (page === "closet") {
        window.dispatchEvent(new Event("closet:filters-change"));
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const appShell = getAppScrollElement()
    const handleScroll = () => setShowScrollTop(getAppScrollTop() > 720)
    handleScroll()
    appShell?.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      appShell?.removeEventListener("scroll", handleScroll)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [activePage])

  useEffect(() => {
    document.body.classList.toggle("app-shell-scroll-lock", activePage !== "login")
    return () => document.body.classList.remove("app-shell-scroll-lock")
  }, [activePage])

  useEffect(() => {
    const handleDetailChange = (event: Event) => {
      const detail = (event as CustomEvent<DetailTitlePayload | null>).detail
      setDetailTitle(buildDetailContextTitle(detail?.item))
    }

    window.addEventListener("closet:detail-change", handleDetailChange)
    return () => window.removeEventListener("closet:detail-change", handleDetailChange)
  }, [])

  useEffect(() => {
    const handleAnalysisTitleChange = (event: Event) => {
      const title = (event as CustomEvent<{ title?: string }>).detail?.title
      setAnalysisTitle(cleanTitlePart(title) || "분석")
    }

    window.addEventListener("closet:analysis-title-change", handleAnalysisTitleChange)
    return () => window.removeEventListener("closet:analysis-title-change", handleAnalysisTitleChange)
  }, [])

  useEffect(() => {
    const step = activePage === "analysis" ? "analysisViewed" : activePage === "my" ? "myViewed" : null
    if (!step) return

    let attempts = 0
    let timer: number | undefined
    const markWhenReady = () => {
      const bridge = getStarterBridge()
      if (bridge?.markStarterStep) {
        bridge.markStarterStep(step)
        return
      }
      if (attempts >= 16) return
      attempts += 1
      timer = window.setTimeout(markWhenReady, 250)
    }

    markWhenReady()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [activePage])

  const navigateTo = (page: AppPage, options: { replace?: boolean; scrollTop?: boolean } = {}) => {
    const nextPath = getPathForPage(page)
    const shouldUpdateHistory = window.location.pathname !== nextPath
    if (activePage !== page) {
      setActivePage(page)
    }
    if (shouldUpdateHistory) {
      window.history[options.replace ? "replaceState" : "pushState"]({}, "", nextPath)
    }
    if (page === "closet") {
      window.dispatchEvent(new Event("closet:filters-change"));
    }
    if (options.scrollTop) {
      window.requestAnimationFrame(() => scrollAppToTop())
    }
  }

  const navigateToMy = (tab: "overview" | "settings" = "overview") => {
    setMyPageTab(tab)
    navigateTo("my", { scrollTop: true })
  }

  const profileExitAction = auth.status === "guest" ? "exit-temporary" : "logout"

  const selectedParentLabel = snapshot.filters.parentCategory === "all" ? "전체" : snapshot.filters.parentCategory
  const selectedChildLabel = snapshot.filters.childCategory === "all" ? "전체" : snapshot.filters.childCategory
  const resultTitle = selectedChildLabel === "전체" ? selectedParentLabel : selectedChildLabel
  const navigationPage: "closet" | "analysis" | "my" = activePage === "analysis" || activePage === "my" ? activePage : "closet"
  const closetContext = detailTitle || `${resultTitle} · ${snapshot.visibleCount}개`
  const topbarContext =
    activePage === "analysis"
      ? analysisTitle
      : activePage === "my"
        ? "마이"
        : activePage === "accountDeletion"
          ? "회원 탈퇴"
          : activePage === "about"
            ? "서비스 소개"
            : activePage === "terms"
              ? "이용약관"
              : activePage === "privacy"
                ? "개인정보처리방침"
                : closetContext
  useEffect(() => {
    document.title = `${topbarContext} · ${BRAND_CONFIG.serviceName}`
  }, [topbarContext])
  const brandOptionRows = snapshot.loading ? 4 : Math.min(snapshot.options.brands.length, 7)
  const brandFilterStyle = {
    "--brand-section-min-height": `${Math.min(360, 128 + brandOptionRows * 38)}px`,
  } as CSSProperties
  const openSheet = (tab: FilterKey) => {
    setActiveSheetTab(tab)
    setSheetOpen(true)
  }

  return (
    <>
      {activePage === "login" ? <LoginPage /> : null}

      <div id="appShell" className="app-shell" hidden={activePage === "login"}>
		        <header className="topbar">
		          <div className="topbar-title">
		            <button
		              className="topbar-logo"
		              type="button"
		              aria-label="홈으로 이동"
			              onClick={() => {
			                navigateTo("closet")
			                scrollAppToTop()
			              }}
		            >
		              {BRAND_CONFIG.serviceName}
		            </button>
			            <span className="mobile-topbar-context">{topbarContext}</span>
		          </div>
          <TopCategoryNav snapshot={snapshot} activePage={navigationPage} setActivePage={navigateTo} />
          
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
            <ThemeToggle className="topbar-icon-action desktop-theme-action" />
            <Popover open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  className={`topbar-icon-action desktop-user-action ${activePage === "my" ? "active" : ""}`}
                  type="button"
                  variant="outline"
                  aria-label="계정 메뉴"
                  title="계정 메뉴"
                >
                  <User className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="topbar-action-menu profile-action-menu" align="end">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigateToMy("overview")
                  }}
                >
                  <User className="size-4" />
                  마이페이지
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigateToMy("settings")
                  }}
                >
                  <Settings2 className="size-4" />
                  설정
                </button>
                <button data-action={profileExitAction} type="button" onClick={() => setProfileMenuOpen(false)}>
                  <LogOut className="size-4" />
                  로그아웃
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
                <FilterSection title="상태">
                  <OptionList
                    className="two-column-option-list"
                    values={snapshot.options.owned}
                    selected={snapshot.filters.owned}
                    onToggle={(value) => toggleFilterValue("owned", value, snapshot)}
                  />
                </FilterSection>
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
                <FilterSection
                  title="브랜드"
                  className="brand-filter-section"
                  scroll
                  style={brandFilterStyle}
                >
                  <SheetFilterPanel tab="brands" snapshot={snapshot} />
                </FilterSection>
                <FilterSection title="평점" className="rating-filter-section">
                  <RatingOptionList snapshot={snapshot} />
                </FilterSection>
              </div>
              <RailActions />
            </div>

            <div className="mobile-filter-surface">
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
	            <StarterChecklist
	              snapshot={starter}
	              onNavigate={(page) => {
                  if (page === "my") {
                    navigateToMy("overview")
                    return
                  }
                  navigateTo(page, { scrollTop: true })
                }}
	            />
	            <div className="content-toolbar">
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
	                <div className="empty-state-actions">
	                  <Button className="button primary" data-action="new-item" type="button">
	                    <Plus className="size-4" />
	                    새 제품 추가
	                  </Button>
	                  <Button
	                    className="button secondary"
	                    type="button"
	                    variant="outline"
	                    onClick={() => setBridgeFilters({ query: "", parentCategory: "all", childCategory: "all", brands: [], colors: [], owned: [], priceRanges: [], ratings: [] })}
	                  >
	                    필터 초기화
	                  </Button>
	                </div>
	              </CardContent>
            </Card>
          </section>

          <aside id="detailPanel" className="detail-panel-bridge" hidden />
        </main>

        {activePage === "analysis" && (
          <Suspense fallback={<PageLoading />}>
            <AnalysisPage />
          </Suspense>
        )}

        {activePage === "my" && (
          <Suspense fallback={<PageLoading />}>
            <MyPage
              activeTab={myPageTab}
              onTabChange={setMyPageTab}
              onNavigate={(page) => navigateTo(page, { scrollTop: true })}
            />
          </Suspense>
        )}
        {activePage === "accountDeletion" && (
          <Suspense fallback={<PageLoading />}>
            <AccountDeletionPage onNavigate={(page) => navigateTo(page, { scrollTop: true })} />
          </Suspense>
        )}
        {activePage === "about" && (
          <Suspense fallback={<PageLoading />}>
            <LegalPage kind="about" />
          </Suspense>
        )}
        {activePage === "terms" && (
          <Suspense fallback={<PageLoading />}>
            <LegalPage kind="terms" />
          </Suspense>
        )}
        {activePage === "privacy" && (
          <Suspense fallback={<PageLoading />}>
            <LegalPage kind="privacy" />
          </Suspense>
        )}

        <AppFooter onNavigate={(page) => navigateTo(page, { scrollTop: true })} />
      </div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="filter-sheet" showCloseButton={false}>
          <DialogHeader className="filter-sheet-header">
            <DialogTitle>필터</DialogTitle>
            <DialogDescription className="sr-only">상품 목록에 적용할 필터를 선택합니다.</DialogDescription>
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

      <Dialog open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <DialogContent className="category-sheet" showCloseButton={false}>
          <DialogHeader className="filter-sheet-header">
            <DialogTitle>카테고리</DialogTitle>
            <DialogDescription className="sr-only">상위 카테고리와 하위 카테고리를 선택합니다.</DialogDescription>
            <Button className="icon-button" type="button" variant="ghost" aria-label="닫기" onClick={() => setCategorySheetOpen(false)}>
              <X className="size-5" />
            </Button>
          </DialogHeader>
          <div className="category-sheet-body">
            <section className="category-sheet-column" aria-label="상위 카테고리">
              <button
                className={snapshot.filters.parentCategory === "all" ? "active" : ""}
                type="button"
                onClick={() => setBridgeFilters({ parentCategory: "all", childCategory: "all" })}
              >
                전체
              </button>
              {snapshot.options.parentCategories.map((category) => (
                <button
                  key={category}
                  className={snapshot.filters.parentCategory === category ? "active" : ""}
                  type="button"
                  onClick={() => setBridgeFilters({ parentCategory: category, childCategory: "all" })}
                >
                  {category}
                </button>
              ))}
            </section>
            <section className="category-sheet-column category-sheet-children" aria-label="하위 카테고리">
              <button
                className={snapshot.filters.childCategory === "all" ? "active" : ""}
                type="button"
                onClick={() => {
                  setBridgeFilters({ childCategory: "all" })
                  setCategorySheetOpen(false)
                }}
              >
                전체 보기
              </button>
              {snapshot.options.childCategories.map((category) => (
                <button
                  key={category}
                  className={snapshot.filters.childCategory === category ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setBridgeFilters({ childCategory: category })
                    setCategorySheetOpen(false)
                  }}
                >
                  {category}
                </button>
              ))}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-sheet" showCloseButton={false}>
          <DialogHeader className="filter-sheet-header">
            <DialogTitle>검색</DialogTitle>
            <DialogDescription className="sr-only">제품명, 브랜드, 색상으로 옷장을 검색합니다.</DialogDescription>
            <Button className="icon-button" type="button" variant="ghost" aria-label="닫기" onClick={() => setSearchOpen(false)}>
              <X className="size-5" />
            </Button>
          </DialogHeader>
          <label className="search-sheet-field">
            <Search className="size-4" />
            <Input
              id="searchInput"
              autoFocus
              type="search"
              value={snapshot.filters.query}
              placeholder="제품명, 브랜드, 색상"
              onChange={(event) => setBridgeFilters({ query: event.target.value })}
            />
          </label>
          <div className="search-sheet-actions">
            <span>{snapshot.visibleCount}개</span>
            {snapshot.filters.query ? (
              <Button className="button secondary compact" type="button" variant="outline" onClick={() => setBridgeFilters({ query: "" })}>
                지우기
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <ClosetDetailDialog />
      </Suspense>

      <dialog id="profileDialog" className="dialog">
        <form method="dialog">
          <header className="dialog-header">
            <h2>게스트 모드</h2>
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
          <p className="dialog-copy">이 기기의 브라우저에만 저장되는 로컬 옷장입니다. Supabase와 동기화하지 않습니다.</p>
          <Button className="button secondary full" data-action="exit-temporary" type="button" variant="outline">
            로그인 모드로 돌아가기
          </Button>
        </form>
      </dialog>

      <dialog id="guestMergeDialog" className="dialog">
        <form method="dialog">
          <header className="dialog-header">
            <h2>게스트 옷장을 가져올까요?</h2>
            <Button
              aria-label="닫기"
              className="icon-button"
              data-action="dismiss-merge-temporary"
              type="button"
              variant="ghost"
            >
              <X className="size-5" />
            </Button>
          </header>
          <p className="dialog-copy">
            게스트 모드에서 만든 제품 <strong data-guest-merge-count>0개</strong>가 있습니다. 계정 옷장을 먼저 불러왔고,
            원하면 게스트 제품만 추가로 가져올 수 있습니다. 예시 제품은 가져오지 않습니다.
          </p>
          <Button className="button primary full" data-action="confirm-merge-temporary" type="button">
            게스트 제품 가져오기
          </Button>
          <Button className="button secondary full" data-action="dismiss-merge-temporary" type="button" variant="outline">
            나중에 하기
          </Button>
        </form>
      </dialog>

      <div id="toast" className="toast" role="status" aria-live="polite" />

      {activePage !== "login" && showScrollTop ? (
        <Button
          aria-label="맨 위로"
          className="scroll-top-button"
          type="button"
	          variant="outline"
	          onClick={() => scrollAppToTop()}
        >
          <ArrowUp className="size-5" />
        </Button>
      ) : null}

      {activePage !== "login" ? (
      <nav className="mobile-bottom-nav">
	        <button className={`nav-item ${activePage === "closet" ? "active" : ""}`} type="button" onClick={() => {
	          navigateTo("closet", { scrollTop: true });
	        }}>
          <Home className="size-6" />
          <span>홈</span>
        </button>
        <button className="nav-item" type="button" onClick={() => {
          navigateTo("closet");
          setCategorySheetOpen(true);
        }}>
          <Menu className="size-6" />
          <span>카테고리</span>
        </button>
        <button className="nav-item" type="button" onClick={() => {
          navigateTo("closet");
          setSearchOpen(true);
        }}>
          <Search className="size-6" />
          <span>검색</span>
        </button>
	        <button className={`nav-item ${activePage === "analysis" ? "active" : ""}`} type="button" onClick={() => {
	          navigateTo("analysis", { scrollTop: true });
	        }}>
          <PieChart className="size-6" />
          <span>분석</span>
        </button>
	        <button className={`nav-item ${activePage === "my" ? "active" : ""}`} type="button" onClick={() => {
	          navigateToMy("overview");
	        }}>
          <User className="size-6" />
          <span>마이</span>
        </button>
      </nav>
      ) : null}
    </>
  )
}

export default App
