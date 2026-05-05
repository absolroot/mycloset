# Styles

The app styles are split by responsibility and imported from `src/index.css` in cascade order. Keep that order intentional: later modules can refine or override earlier shared primitives.

## File Map

- `00-tokens.css` - Tailwind theme bridge, app design tokens, and light/dark mode values.
- `01-base.css` - Document reset, base elements, and app shell primitives.
- `02-auth.css` - Login and guest-entry surfaces.
- `03-app-chrome.css` - Top bar, global navigation, and account popover chrome.
- `04-my-page.css` - My Page account, settings, backup, and legal navigation surfaces.
- `05-controls.css` - Shared buttons, form fields, selects, popovers, and segmented controls.
- `06-closet-content.css` - Closet content toolbar, loading state, item cards, chips, and prices.
- `07-detail.css` - Item detail modal, media editor, form layout, measurements, and detail actions.
- `08-overlays.css` - Native dialogs and toast overlays.
- `09-legal-footer.css` - Legal pages and app footer.
- `10-responsive-core.css` - Core responsive behavior for layout, filters, dialogs, and mobile sheets.
- `11-mobile-navigation.css` - Mobile bottom navigation, scroll-to-top, detail mobile affordances, and topbar search sheets.
- `12-analysis.css` - Analysis dashboard cards, charts, tabs, rankings, and responsive analysis rules.
- `13-mobile-border-fixes.css` - Mobile border rendering fixes and final visual polish overrides.

## Rules

- Add new design tokens in `00-tokens.css` before using them elsewhere.
- Put page or surface styles in the matching domain file instead of growing `index.css`.
- Keep responsive rules with the existing responsive module unless a surface already owns a tightly scoped media query.
- Avoid hard-coded theme colors unless the value represents real product imagery or a semantic swatch.
