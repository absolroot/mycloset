export type AppPage = "closet" | "analysis" | "login" | "my" | "accountDeletion" | "about" | "terms" | "privacy"

export const APP_PAGE_PATHS: Record<AppPage, string> = {
  closet: "/",
  analysis: "/analysis",
  login: "/login",
  my: "/my",
  accountDeletion: "/account-deletion",
  about: "/about",
  terms: "/terms",
  privacy: "/privacy",
}

export function getPathForPage(page: AppPage) {
  return APP_PAGE_PATHS[page]
}

export function getPageFromPathname(pathname: string): AppPage {
  for (const [page, path] of Object.entries(APP_PAGE_PATHS) as [AppPage, string][]) {
    if (pathname === path) return page
  }
  return "closet"
}
