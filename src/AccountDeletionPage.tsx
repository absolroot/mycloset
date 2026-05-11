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
          <span>계정 삭제와 옷장 데이터 삭제 요청을 한 곳에서 처리합니다.</span>
        </div>
      </header>

      <section className="account-deletion-panel" aria-label="회원 탈퇴 안내">
        <div className="account-deletion-copy">
          <ShieldCheck className="size-5" />
          <div>
            <h2>탈퇴 요청 시 옷장 데이터 삭제도 함께 요청됩니다.</h2>
            <p>
              마이페이지에서는 계정 옷장 데이터만 단독으로 삭제하는 버튼을 제공하지 않습니다. 잘못된 삭제 범위를 줄이기 위해
              탈퇴 요청 화면에서만 계정과 연결된 데이터 삭제를 함께 접수합니다.
            </p>
          </div>
        </div>

        <div className="account-deletion-steps">
          <div>
            <strong>1. 백업</strong>
            <span>필요한 기록은 먼저 JSON 또는 ZIP으로 내보냅니다.</span>
          </div>
          <div>
            <strong>2. 탈퇴 요청</strong>
            <span>요청이 접수되면 운영 처리 과정에서 계정과 연결된 옷장 데이터 삭제가 함께 진행됩니다.</span>
          </div>
          <div>
            <strong>3. 처리 확인</strong>
            <span>삭제가 완료된 데이터는 복구가 어려울 수 있습니다.</span>
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
                회원 탈퇴 요청
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
