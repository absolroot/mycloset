import { type MouseEvent } from "react"
import {
  Archive,
  ChevronRight,
  Cloud,
  Database,
  Download,
  FileText,
  Info,
  LogIn,
  LogOut,
  Mail,
  Settings2,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BRAND_CONFIG } from "./brand/brandConfig"
import { type AppPage } from "./appRoutes"
import { useAuthSnapshot, type AuthSnapshot } from "./closet/authBridge"
import { resetCategoryVisibility, setCategoryChildVisible, setCategoryParentVisible, useCategorySettingsSnapshot } from "./closet/categorySettingsBridge"
import { ThemeToggle } from "./theme/ThemeToggle"

type MyPageNavigationTarget = Extract<AppPage, "closet" | "about" | "terms" | "privacy" | "accountDeletion">
type MyPageTab = "overview" | "settings"

type MyPageProps = {
  activeTab?: MyPageTab
  onTabChange?: (tab: MyPageTab) => void
  onNavigate: (page: MyPageNavigationTarget) => void
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="google-logo" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

function getStatusCopy(auth: AuthSnapshot) {
  if (auth.status === "signed-in") {
    return {
      eyebrow: "Google 로그인",
      title: auth.displayName || auth.email || "로그인된 계정",
      description: "계정 동기화로 여러 기기에서 같은 옷장을 사용할 수 있습니다.",
    }
  }

  if (auth.status === "guest") {
    return {
      eyebrow: "게스트 모드",
      title: "이 기기의 옷장",
      description: "현재 옷장은 이 브라우저에 저장됩니다. 계정 동기화가 필요할 때만 Google로 전환하세요.",
    }
  }

  return {
    eyebrow: "로그아웃 상태",
    title: "로그인이 필요합니다",
    description: `게스트 모드로 시작하거나, 계정 동기화가 필요하면 Google로 로그인할 수 있습니다.`,
  }
}

function formatSyncState(auth: AuthSnapshot) {
  if (auth.status === "guest") return "로컬 저장"
  if (auth.syncing) return "동기화 중"
  if (auth.lastSyncError) return "동기화 확인 필요"
  if (auth.hasPendingSync) return "동기화 대기"
  if (auth.status === "signed-in") return auth.lastSyncedAt ? "동기화됨" : "로그인됨"
  return auth.supabaseReady ? "연결 준비됨" : "로그인 전"
}

function formatLastSyncedAt(value: string) {
  if (!value) return "없음"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "확인 필요"
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function getCategoryControlId(...parts: string[]) {
  return `category-setting-${parts.map((part) => encodeURIComponent(part)).join("__")}`
}

function CategoryDisplaySettings() {
  const snapshot = useCategorySettingsSnapshot()
  const visibleParentCount = snapshot.visibleParents.length
  const totalParentCount = snapshot.allParents.length

  return (
    <section className="my-section my-category-section" aria-label="카테고리 표시 설정">
      <div className="my-category-section-header">
        <div className="my-section-heading">
          <Settings2 className="size-4" />
          <h3>카테고리 표시</h3>
        </div>
        <Button className="my-category-reset-button" type="button" variant="outline" size="sm" onClick={resetCategoryVisibility}>
          모두 표시
        </Button>
      </div>
      <div className="my-category-summary">
        <span>{totalParentCount ? `상위 ${visibleParentCount}/${totalParentCount}개 · 하위 ${snapshot.visibleChildCount}/${snapshot.totalChildCount}개 표시` : "카테고리 불러오는 중"}</span>
        <p>전체 카테고리 트리에서 옷장 화면에 보여줄 항목만 체크합니다.</p>
      </div>
      <div className="my-category-tree">
        {snapshot.tree.map((parent) => {
          const parentControlId = getCategoryControlId(parent.name)

          return (
            <div key={parent.name} className={parent.visible ? "my-category-tree-group active" : "my-category-tree-group"}>
              <div className="my-category-parent-toggle">
                <Checkbox
                  id={parentControlId}
                  className="my-category-checkbox"
                  checked={parent.visible}
                  onCheckedChange={(checked) => setCategoryParentVisible(parent.name, checked === true)}
                />
                <label htmlFor={parentControlId}>{parent.name}</label>
                <small>{parent.count ? `${parent.count.toLocaleString("ko-KR")}개` : "0개"}</small>
              </div>
              <div className="my-category-child-list">
                {parent.children.map((child) => {
                  const childControlId = getCategoryControlId(parent.name, child.name)
                  const childActive = child.visible && parent.visible

                  return (
                    <div
                      key={child.name}
                      className={childActive ? "my-category-child-toggle active" : "my-category-child-toggle"}
                      data-disabled={!parent.visible || undefined}
                    >
                      <Checkbox
                        id={childControlId}
                        className="my-category-checkbox"
                        checked={childActive}
                        disabled={!parent.visible}
                        onCheckedChange={(checked) => setCategoryChildVisible(parent.name, child.name, checked === true)}
                      />
                      <label htmlFor={childControlId}>{child.name}</label>
                      <small>{child.count ? `${child.count.toLocaleString("ko-KR")}개` : "0개"}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DataPortabilitySettings() {
  return (
    <section className="my-section my-data-portability-section" aria-label="데이터 가져오기와 내보내기">
      <div className="my-section-heading">
        <Database className="size-4" />
        <h3>데이터 가져오기/내보내기</h3>
      </div>
      <div className="my-menu-list my-data-portability-list">
        <button data-action="import-csv" type="button">
          <Upload className="size-4" />
          CSV 가져오기
        </button>
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
      </div>
    </section>
  )
}

function isMyPageTab(value: string): value is MyPageTab {
  return value === "overview" || value === "settings"
}

export function MyPage({ activeTab = "overview", onTabChange, onNavigate }: MyPageProps) {
  const auth = useAuthSnapshot()
  const copy = getStatusCopy(auth)
  const isSignedIn = auth.status === "signed-in"
  const isGuest = auth.status === "guest"
  const sampleItemCount = auth.sampleItemCount ?? 0
  const ownItemCount = auth.ownItemCount ?? Math.max(0, auth.itemCount - sampleItemCount)
  const navigateInApp = (event: MouseEvent<HTMLAnchorElement>, page: MyPageNavigationTarget) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    onNavigate(page)
  }
  const handleTabChange = (value: string) => {
    if (isMyPageTab(value)) onTabChange?.(value)
  }

  return (
    <main className="my-page" aria-labelledby="myPageTitle">
      <section className="my-hero">
        <div className="my-avatar" aria-hidden="true">
          {auth.avatarUrl ? <img src={auth.avatarUrl} alt="" /> : <User className="size-7" />}
        </div>
        <div className="my-identity">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="myPageTitle">{copy.title}</h2>
          <p>{copy.description}</p>
          {auth.email ? (
            <span className="my-email">
              <Mail className="size-4" />
              {auth.email}
            </span>
          ) : null}
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="my-tabs">
        <TabsList className="my-tabs-list" aria-label="마이페이지 메뉴">
          <TabsTrigger value="overview" className="my-tab-trigger">
            <User aria-hidden="true" />
            <span>
              <strong>내 정보</strong>
              <small>계정 상태와 서비스 정보</small>
            </span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="my-tab-trigger">
            <Settings2 aria-hidden="true" />
            <span>
              <strong>설정</strong>
              <small>화면, 카테고리, 백업</small>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="my-tab-content">
          <section className="my-grid" aria-label="마이페이지 정보">
            <section className="my-action-panel" aria-label="계정 작업">
              {isSignedIn ? (
                <Button className="button danger my-primary-action" data-action="logout" type="button" variant="destructive" disabled={auth.syncing}>
                  <LogOut className="size-4" />
                  로그아웃
                </Button>
              ) : isGuest ? null : (
                <Button className="google-login-button my-secondary-action" data-action="login" type="button" variant="outline">
                  <GoogleLogo />
                  Google로 동기화하기
                </Button>
              )}
              {isGuest ? (
                <Button className="button secondary my-secondary-action" data-action="exit-temporary" type="button" variant="outline">
                  <LogIn className="size-4" />
                  로그인 화면으로 돌아가기
                </Button>
              ) : null}
              {isSignedIn ? (
                <Button className="button secondary my-secondary-action" data-action="merge-temporary" type="button" variant="outline" disabled={auth.syncing}>
                  <Upload className="size-4" />
                  게스트 옷장 가져오기
                </Button>
              ) : null}
            </section>

            <section className="my-trust-panel" aria-label="저장과 백업 안내">
              <div className="my-trust-copy">
                <ShieldCheck className="size-5" />
                <div>
                  <h3>{isGuest ? "브라우저에 저장 중입니다" : isSignedIn ? "Google 계정 동기화 상태" : "저장 방식을 선택하세요"}</h3>
                  <p>
                    {isGuest
                      ? `내 제품 ${ownItemCount.toLocaleString("ko-KR")}개와 예시 ${sampleItemCount.toLocaleString("ko-KR")}개가 이 기기에 있습니다. 다른 기기에서도 쓰려면 ZIP 백업이나 Google 동기화를 남기세요.`
                      : isSignedIn
                        ? auth.hasPendingSync
                          ? "아직 반영 중인 변경이 있습니다. 잠시 후 계정 옷장에 자동으로 반영됩니다."
                          : "계정 옷장으로 저장됩니다. 로컬 백업을 함께 남기면 이미지까지 따로 보관할 수 있습니다."
                        : "로그인 전에는 게스트 모드로 먼저 써보고, 필요한 시점에 Google 동기화로 전환할 수 있습니다."}
                  </p>
                </div>
              </div>
              <div className="my-trust-actions">
                {isGuest ? (
                  <>
                    <Button className="button secondary" data-action="export-zip" type="button" variant="outline">
                      <Archive className="size-4" />
                      ZIP 백업
                    </Button>
                    <Button className="google-login-button" data-action="login" type="button" variant="outline">
                      <GoogleLogo />
                      Google 동기화
                    </Button>
                  </>
                ) : isSignedIn ? (
                  <Button className="button secondary" data-action="export-zip" type="button" variant="outline">
                    <Archive className="size-4" />
                    ZIP 백업
                  </Button>
                ) : (
                  <Button className="google-login-button" data-action="login" type="button" variant="outline">
                    <GoogleLogo />
                    Google로 시작
                  </Button>
                )}
              </div>
            </section>

            <div className="my-section my-status-section">
              <div className="my-section-heading">
                <Cloud className="size-4" />
                <h3>상태</h3>
              </div>
              <dl className="my-status-list">
                <div>
                  <dt>저장 방식</dt>
                  <dd>{isGuest ? "게스트 로컬 저장" : isSignedIn ? "계정 동기화" : "로그인 필요"}</dd>
                </div>
                <div>
                  <dt>Google 계정</dt>
                  <dd>{isSignedIn ? auth.email || auth.displayName || "연결됨" : "연결 안 됨"}</dd>
                </div>
                <div>
                  <dt>계정 동기화</dt>
                  <dd>{formatSyncState(auth)}</dd>
                </div>
                <div>
                  <dt>대기 작업</dt>
                  <dd>{auth.pendingSyncCount.toLocaleString("ko-KR")}개</dd>
                </div>
                <div>
                  <dt>최근 동기화</dt>
                  <dd>{formatLastSyncedAt(auth.lastSyncedAt)}</dd>
                </div>
                <div>
                  <dt>제품 수</dt>
                  <dd>{auth.itemCount.toLocaleString("ko-KR")}개</dd>
                </div>
              </dl>
            </div>

            <div className="my-section my-note-section">
              <div className="my-section-heading">
                <ShieldCheck className="size-4" />
                <h3>계정 옷장</h3>
              </div>
              <p>
                게스트 옷장과 로그인 계정 옷장은 분리되어 있습니다. 로그인 후에는 계정 옷장을 먼저 불러오고, 필요할 때 게스트 옷장 가져오기로 직접 추가할 수 있습니다.
              </p>
            </div>

            <div className="my-section my-legal-section">
              <div className="my-section-heading">
                <FileText className="size-4" />
                <h3>서비스 이용정보</h3>
              </div>
              <div className="my-menu-list my-legal-list">
                <a href="/about" onClick={(event) => navigateInApp(event, "about")}>
                  <Info className="size-4" />
                  <span>서비스 소개</span>
                  <ChevronRight className="size-4 my-menu-chevron" />
                </a>
                <a href="/terms" onClick={(event) => navigateInApp(event, "terms")}>
                  <FileText className="size-4" />
                  <span>이용약관</span>
                  <ChevronRight className="size-4 my-menu-chevron" />
                </a>
                <a href="/privacy" onClick={(event) => navigateInApp(event, "privacy")}>
                  <ShieldCheck className="size-4" />
                  <span>개인정보처리방침</span>
                  <ChevronRight className="size-4 my-menu-chevron" />
                </a>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="settings" className="my-tab-content">
          <div className="my-settings-stack">
            <CategoryDisplaySettings />
            <DataPortabilitySettings />
            <section className="my-section my-settings-theme-section" aria-label="화면 설정">
              <div className="my-section-heading">
                <Settings2 className="size-4" />
                <h3>화면 설정</h3>
              </div>
              <div className="my-setting-row">
                <span>화면 모드</span>
                <ThemeToggle className="my-theme-toggle" />
              </div>
            </section>
          </div>
        </TabsContent>
        {isSignedIn ? (
          <p className="my-account-exit-link">
            <a href="/account-deletion" onClick={(event) => navigateInApp(event, "accountDeletion")}>
              회원 탈퇴
            </a>
          </p>
        ) : null}
      </Tabs>
    </main>
  )
}
