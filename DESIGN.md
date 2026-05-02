# Closet Design System

## Direction

Closet is an operational wardrobe manager, not a landing page. The interface should feel quiet, dense, and consistent: fast scanning, clear editing, and predictable controls across desktop and mobile.

The app now uses a Vite React shell with shadcn/ui as the component baseline. Existing wardrobe data logic still renders some dynamic DOM directly, so those legacy class names must be styled from the same shadcn token set in `src/index.css`.

## shadcn Baseline

Use shadcn/ui components first for new React UI:

- `Button` for all primary, secondary, icon, import/export, and modal actions.
- `Input` and `Textarea` for text entry.
- `Select` for visible dropdown controls. If legacy code still requires a native `<select>`, keep it as a hidden bridge only and render the user-facing control with shadcn `Select`.
- `ToggleGroup` for segmented controls such as owned status and grid/list view mode.
- `Checkbox` for binary edit fields such as owned/unowned state.
- `Badge` for small status and product metadata.
- `Card` only for repeated item surfaces, empty states, and contained utility blocks.
- `Separator` for filter grouping.
- `ScrollArea` for sidebar/filter scrolling and long modal body scrolling.
- `Slider` for image scale and position controls.
- `Calendar` inside `Popover` for date picking.
- `Dialog` for product detail editing. The current Supabase auth dialog remains native `<dialog>` because legacy sync code calls `showModal()` and `close()` directly.

Do not introduce a separate visual system for one-off elements. If a new control is needed, either add the relevant shadcn component or style the legacy class using the same tokens.

## Tokens

The canonical token source is `src/index.css`.

- Base color: shadcn `zinc`.
- Radius: `0.5rem`.
- Background: `--background`.
- Main surface: `--card`.
- Text: `--foreground`.
- Muted text: `--muted-foreground`.
- Border/input: `--border`, `--input`.
- Focus: `--ring`.
- Destructive: `--destructive`.

Avoid adding hard-coded colors unless the value represents product imagery or semantic data such as clothing color swatches.

## Layout

Desktop:

- Sticky top bar.
- Left filter rail.
- Main product grid/list.
- Product detail opens as a centered modal.

Mobile:

- Filters stack above content.
- Product detail modal uses nearly full viewport width.
- Image area stays square.
- Action buttons must not cover form fields.

## Product Detail Modal

The modal order is fixed:

1. Header with product name and close button.
2. Square image area.
3. Optional image URL or image edit section.
4. Basic information.
5. Purchase information.
6. Memo.
7. Measurements.
8. Delete/share/save actions.

The product detail modal is rendered in React with shadcn `Dialog`, while `assets/js/app.js` remains the data and sync controller. The image area uses a white background so transparent PNG/WebP assets display predictably. URL images are stored as URL data, not downloaded into IndexedDB.

## Legacy DOM Styling

The following legacy classes are still produced by `assets/js/app.js` and must remain styled in `src/index.css`:

- `.button`, `.icon-button`
- `.summary-card`
- `.item-tile`, `.image-slot`, `.chip`
- `.detail-panel-bridge`, `.detail-form`, `.detail-cover`
- `.unified-image-toolbar`
- `.hidden-section`
- `.form-section`, `.form-grid`, `.field`
- `.category-grid`, `.category-grid-btn`
- `.measure-grid`
- `.dialog`, `.toast`

React-rendered shell and modal controls should use shadcn components directly. The current filter dropdowns use shadcn `Select` with hidden native select bridges so the legacy filtering code can continue reading `.value` and `change` events without exposing browser-default selects in the UI.

When replacing legacy-rendered UI with React later, migrate one area at a time and remove only the corresponding legacy CSS after verifying the old class is no longer emitted.
