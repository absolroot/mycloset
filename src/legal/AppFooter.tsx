import { LEGAL_CONFIG } from "./legalConfig"

export function AppFooter({ compact = false }: { compact?: boolean }) {
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
            <a href="/about">서비스 소개</a>
            <a href="/terms">이용약관</a>
            <a href="/privacy">개인정보처리방침</a>
          </nav>
        </div>

        <p className="app-footer-meta">
          © {LEGAL_CONFIG.copyrightYear} {LEGAL_CONFIG.serviceName} ({LEGAL_CONFIG.englishName}). All rights reserved.
        </p>
      </div>
    </footer>
  )
}
