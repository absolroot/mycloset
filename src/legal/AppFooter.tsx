import { type MouseEvent } from "react"
import { type AppPage } from "../appRoutes"
import { LEGAL_CONFIG } from "./legalConfig"

type FooterPage = Extract<AppPage, "about" | "terms" | "privacy">

type AppFooterProps = {
  compact?: boolean
  onNavigate?: (page: FooterPage) => void
}

export function AppFooter({ compact = false, onNavigate }: AppFooterProps) {
  const navigateInApp = (event: MouseEvent<HTMLAnchorElement>, page: FooterPage) => {
    if (!onNavigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    onNavigate(page)
  }

  return (
    <footer className={`app-footer ${compact ? "app-footer-compact" : ""}`}>
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <strong>{LEGAL_CONFIG.serviceName}</strong>
          <span>{LEGAL_CONFIG.tagline}</span>
        </div>

        <div className="app-footer-legal">
          <span>서비스 이용정보</span>
          <nav className="app-footer-links" aria-label="법적 고지">
            <a href="/about" onClick={(event) => navigateInApp(event, "about")}>
              서비스 소개
            </a>
            <a href="/terms" onClick={(event) => navigateInApp(event, "terms")}>
              이용약관
            </a>
            <a href="/privacy" onClick={(event) => navigateInApp(event, "privacy")}>
              개인정보처리방침
            </a>
          </nav>
        </div>

        <p className="app-footer-meta">
          © {LEGAL_CONFIG.copyrightYear} {LEGAL_CONFIG.serviceName} ({LEGAL_CONFIG.englishName}). All rights reserved.
        </p>
      </div>
    </footer>
  )
}
