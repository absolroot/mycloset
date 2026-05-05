import { ShieldCheck } from "lucide-react"
import { LEGAL_DOCUMENTS, type LegalPageKind } from "./legalContent"

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const document = LEGAL_DOCUMENTS[kind]

  return (
    <main className="legal-page" aria-labelledby="legalPageTitle">
      <header className="legal-hero">
        <div className="legal-hero-icon" aria-hidden="true">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="eyebrow">Legal</p>
          <h1 id="legalPageTitle">{document.title}</h1>
          <p>{document.description}</p>
          <span>시행일 및 최종 업데이트: {document.updatedAt}</span>
        </div>
      </header>

      <section className="legal-content" aria-label={document.title}>
        {document.sections.map((section) => (
          <article className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  )
}
