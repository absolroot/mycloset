import { type MouseEvent } from "react"
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  Download,
  FileText,
  Info,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Shirt,
  Trash2,
  Upload,
  User,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BRAND_CONFIG } from "./brand/brandConfig"
import { type AppPage } from "./appRoutes"
import { useAuthSnapshot, type AuthSnapshot } from "./closet/authBridge"
import { ThemeToggle } from "./theme/ThemeToggle"

type MyPageNavigationTarget = Extract<AppPage, "closet" | "about" | "terms" | "privacy">

type MyPageProps = {
  onGoCloset: () => void
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

export function MyPage({ onGoCloset, onNavigate }: MyPageProps) {
  const auth = useAuthSnapshot()
  const copy = getStatusCopy(auth)
  const isSignedIn = auth.status === "signed-in"
  const isGuest = auth.status === "guest"
  const navigateInApp = (event: MouseEvent<HTMLAnchorElement>, page: MyPageNavigationTarget) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    onNavigate(page)
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

      <section className="my-action-panel" aria-label="계정 작업">
        {isSignedIn ? (
          <Button className="button danger my-primary-action" data-action="logout" type="button" variant="destructive" disabled={auth.syncing}>
            <LogOut className="size-4" />
            로그아웃
          </Button>
        ) : (
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

      <section className="my-grid" aria-label="마이페이지 정보">
        <div className="my-section">
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
              <dt>동기화</dt>
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
          {isSignedIn ? (
            <div className="my-sync-actions">
              <Button className="button secondary" data-action="sync-now" type="button" variant="outline" disabled={auth.syncing}>
                <RefreshCw className="size-4" />
                {auth.lastSyncError || auth.hasPendingSync ? "동기화 재시도" : "지금 동기화"}
              </Button>
              {auth.lastSyncError ? <p className="my-inline-warning">{auth.lastSyncErrorMessage || "마지막 동기화가 실패했습니다."}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="my-section my-theme-section">
          <div className="my-section-heading">
            <Settings2 className="size-4" />
            <h3>설정</h3>
          </div>
          <div className="my-setting-row">
            <span>화면 모드</span>
            <ThemeToggle className="my-theme-toggle" />
          </div>
        </div>

        <div className="my-section">
          <div className="my-section-heading">
            <Shirt className="size-4" />
            <h3>옷장 작업</h3>
          </div>
          <div className="my-menu-list">
            <button type="button" onClick={onGoCloset}>
              <CheckCircle2 className="size-4" />
              옷장으로 이동
            </button>
            <button data-action="import-csv" type="button">
              <Upload className="size-4" />
              CSV 가져오기
            </button>
            <button data-action="export-csv" type="button">
              <Download className="size-4" />
              CSV 내보내기
            </button>
          </div>
        </div>

        <div className="my-section">
          <div className="my-section-heading">
            <Database className="size-4" />
            <h3>백업</h3>
          </div>
          <div className="my-menu-list">
            <button data-action="export-json" type="button">
              <Database className="size-4" />
              JSON 백업
            </button>
            <button data-action="export-zip" type="button">
              <Archive className="size-4" />
              이미지 포함 ZIP 백업
            </button>
          </div>
        </div>

        <div className="my-section my-note-section">
          <div className="my-section-heading">
            <ShieldCheck className="size-4" />
            <h3>안내</h3>
          </div>
          <p>
            게스트 옷장과 로그인 계정 옷장은 분리되어 있습니다. 로그인 후에는 계정 옷장을 먼저 불러오고, 필요할 때 게스트 옷장 가져오기로 직접 추가할 수 있습니다.
          </p>
        </div>

        <div className="my-section my-danger-section">
          <div className="my-section-heading">
            <AlertTriangle className="size-4" />
            <h3>데이터 관리</h3>
          </div>
          <div className="my-menu-list">
            {isGuest ? (
              <button className="my-danger-menu-button" data-action="clear-guest-data" type="button">
                <RotateCcw className="size-4" />
                게스트 데이터 초기화
              </button>
            ) : null}
            {isSignedIn ? (
              <>
                <button className="my-danger-menu-button" data-action="delete-account-wardrobe" type="button" disabled={auth.syncing}>
                  <Trash2 className="size-4" />
                  계정 옷장 데이터 삭제
                </button>
                <button className="my-danger-menu-button" data-action="request-account-deletion" type="button" disabled={auth.syncing}>
                  <UserX className="size-4" />
                  계정 삭제 요청
                </button>
              </>
            ) : null}
            {!isGuest && !isSignedIn ? (
              <button type="button" onClick={onGoCloset}>
                <CheckCircle2 className="size-4" />
                옷장으로 이동
              </button>
            ) : null}
          </div>
          <p className="my-danger-note">계정 자체 삭제는 운영자 처리 또는 서버 함수가 필요하므로 요청 접수로 관리합니다. 옷장 데이터 삭제 전에는 JSON 또는 ZIP 백업을 먼저 남기세요.</p>
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
    </main>
  )
}
