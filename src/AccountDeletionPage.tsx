import { Archive, ChevronLeft, Database, ShieldCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type AppPage } from "./appRoutes"
import { useAuthSnapshot } from "./closet/authBridge"

type AccountDeletionPageProps = {
  onNavigate: (page: Extract<AppPage, "my">) => void
}

export function AccountDeletionPage({ onNavigate }: AccountDeletionPageProps) {
  const auth = useAuthSnapshot()
  const isSignedIn = auth.status === "signed-in"

  return (
    <main className="account-deletion-page" aria-labelledby="accountDeletionTitle">
      <header className="account-deletion-hero">
        <div className="account-deletion-icon" aria-hidden="true">
          <UserX className="size-5" />
        </div>
        <div>
          <p className="eyebrow">Account</p>
          <h1 id="accountDeletionTitle">회원 탈퇴</h1>
          <span>탈퇴 전에 보관할 기록을 먼저 백업해 주세요.</span>
        </div>
      </header>

      <section className="account-deletion-panel" aria-label="회원 탈퇴 안내">
        <div className="account-deletion-copy">
          <ShieldCheck className="size-5" />
          <div>
            <h2>탈퇴하면 계정과 연결된 옷장 정보도 함께 삭제됩니다.</h2>
            <p>
              삭제된 정보는 되돌리기 어렵습니다. 보관하고 싶은 기록이 있다면 아래 백업 버튼으로 먼저 내려받아 주세요.
            </p>
          </div>
        </div>

        <div className="account-deletion-steps">
          <div>
            <strong>1. 기록 백업</strong>
            <span>나중에 다시 보고 싶은 기록이 있다면 파일로 내려받습니다.</span>
          </div>
          <div>
            <strong>2. 탈퇴 신청</strong>
            <span>탈퇴 신청을 하면 계정과 연결된 옷장 정보도 함께 정리됩니다.</span>
          </div>
          <div>
            <strong>3. 완료 안내</strong>
            <span>처리가 끝나면 더 이상 해당 계정의 옷장 정보를 사용할 수 없습니다.</span>
          </div>
        </div>

        <div className="account-deletion-actions">
          <Button type="button" variant="outline" onClick={() => onNavigate("my")}>
            <ChevronLeft className="size-4" />
            마이페이지로 돌아가기
          </Button>
          {isSignedIn ? (
            <>
              <Button data-action="export-json" type="button" variant="outline">
                <Database className="size-4" />
                JSON 백업
              </Button>
              <Button data-action="export-zip" type="button" variant="outline">
                <Archive className="size-4" />
                ZIP 백업
              </Button>
              <Button data-action="request-account-deletion" data-withdrawal-context="account-deletion" type="button" variant="destructive" disabled={auth.syncing}>
                <UserX className="size-4" />
                회원 탈퇴 신청
              </Button>
            </>
          ) : (
            <Button data-action="login" type="button">
              Google로 로그인
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
