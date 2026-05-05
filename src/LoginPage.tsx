import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BRAND_CONFIG } from "./brand/brandConfig"
import { AppFooter } from "./legal/AppFooter"
import { ThemeToggle } from "./theme/ThemeToggle"
import appIconUrl from "../assets/icon.svg?url"

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

export function LoginPage() {
  return (
    <main className="login-page" aria-labelledby="loginTitle">
      <ThemeToggle className="login-theme-action" />
      <section className="login-panel">
        <div className="login-brand-mark" aria-hidden="true">
          <img src={appIconUrl} alt="" />
        </div>

        <div className="login-copy">
          <p className="login-eyebrow">{BRAND_CONFIG.tagline}</p>
          <h1 id="loginTitle">{BRAND_CONFIG.serviceName}</h1>
          <p>게스트로 바로 시작하고, 필요할 때 Google 계정으로 전환할 수 있습니다.</p>
        </div>

        <form id="authForm" className="login-actions">
          <Button className="button primary full guest-login-button" data-action="start-temporary" type="button">
            게스트 모드로 시작하기
          </Button>
          <Button className="google-login-button" data-action="login" type="button" variant="outline">
            <GoogleLogo />
            Google로 로그인하기
          </Button>
        </form>

        <div className="login-local-note">
          <ShieldCheck className="size-4" />
          <span>게스트 모드는 이 브라우저에 저장되며, 처음 시작하면 예시 제품 3개가 함께 표시됩니다.</span>
        </div>
      </section>
      <AppFooter compact />
    </main>
  )
}
