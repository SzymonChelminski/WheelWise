# WheelWise design specification

Implemented in `src/app/globals.css` (tokens), `src/components/ui/**`, `src/components/layout/SiteShell.tsx`.
Static previews: `src/app/[locale]/design-preview/**` (run with `NEXT_PUBLIC_DESIGN_PREVIEW=1`). Sample data and texts: `src/mocks/**`.
All class names below are Tailwind CSS 4 utilities generated from the tokens in section 3.

## 1. Design rationale

**Concept: a cost ledger, not a car showroom.** Every car is drawn as one horizontal *cost strip* split into six cost categories that always keep the same order and colour; around it the interface is typographic and numeric, with no photographs and no decoration.

- **Speed, simplicity (szybkość, prostota):** the answer (a monthly amount) is the largest thing on every row and page; one search field on the home page; rankings are plain lists, not card grids; the mobile metric selector is a native select.
- **Minimalism:** two colours do the work (petrol for structure and actions, amber only for the one call to action on dark surfaces and for the current navigation item); cost colours appear only inside the strip and its legend.
- **Accessibility, trust (dostępność, zaufanie):** every estimate carries the same quiet "≈" sign, every list price carries the words "cena orientacyjna" and its date; the best value in a comparison is marked with a tick and a word; all text pairs exceed 4.5:1.

Audience: ordinary people checking whether they can afford a new car, on phones and computers equally. Tone of the texts: plain, calm, second person, no sales language.

What a user should remember: the coloured strip that shows where the money goes.

Avoid: car photographs, manufacturer logos, card grids with icons, gradients, glow, glass effects, shadows on static content, colour as the only carrier of meaning, all-caps labels, eyebrow labels above headings.

Typeface rationale: Barlow was drawn from Californian road signs and licence plates, so it belongs to the subject; its semi-condensed cut keeps long car names (the catalogue has names of up to 103 characters, such as "Jeep COMPASS 1.5 Turbo T4 (130ch) BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S") and amounts compact.

## 2. Theme decision

**Light theme only.** The product is a table of small figures read in daylight on phones as often as at a desk; dark text on a light ground gives the best legibility for dense numbers, and one theme keeps the six cost colours and four scale colours verified against a single set of backgrounds. `color-scheme: light` is set on `:root`. Header, footer, home hero and comparison bar are dark petrol surfaces inside the light theme; they carry `data-surface="dark"`, which switches the focus ring to amber.

## 3. Tokens

File: `src/app/globals.css`, block `@theme` (the default Tailwind colour, text-size, radius and shadow scales are removed with `--color-*: initial` and so on; only the values below exist).

### 3.1 Colour

| Token | Value | Role |
|---|---|---|
| `--color-ground` | `#f1f4f5` | Page background; table header band in `DataTable` |
| `--color-surface` | `#ffffff` | Panels, lists, fields, sheets, popovers |
| `--color-sunken` | `#e6ecee` | Bar tracks, skeleton blocks, disabled fills, indicative tag |
| `--color-ink` | `#0e1f24` | Primary text |
| `--color-ink-muted` | `#465a61` | Secondary text, placeholders, icons in fields |
| `--color-line` | `#d3dcdf` | Decorative hairlines: panel borders, row dividers (not a component boundary) |
| `--color-line-strong` | `#73868d` | Boundaries of interactive components (fields, secondary buttons, chips, switches); group rules in tables |
| `--color-brand` | `#125868` | Primary button, links, selected states, focus ring on light surfaces, single-value bars |
| `--color-brand-strong` | `#0e4553` | Header and hero background; hover of primary; chips inside the comparison bar |
| `--color-brand-deep` | `#082f39` | Footer and comparison bar background; pressed primary |
| `--color-brand-soft` | `#eaf4f6` | Hover background of rows and secondary controls; total band in the comparison; "reasonable" level |
| `--color-brand-tint` | `#cfe6eb` | Selected chip, active search option, pressed secondary, text selection |
| `--color-on-brand` | `#ffffff` | Text on the three brand backgrounds |
| `--color-on-brand-muted` | `#bfdce3` | Secondary text on brand-strong and brand-deep |
| `--color-signal` | `#ffb81c` | Amber: the "Compare" action in the comparison bar, current-page underline, count badge, focus ring on dark surfaces, skip link, one sixth of the logo ring |
| `--color-signal-strong` | `#f2a600` | Hover and pressed state of the signal button |
| `--color-on-signal` | `#0e1f24` | Text on amber |
| `--color-positive` | `#17663a` | "Best value" mark, "comfortable" level |
| `--color-positive-soft` | `#e2f2e7` | Background of the two above |
| `--color-caution` | `#7a4f00` | "Stretching it" level |
| `--color-caution-soft` | `#fff0c7` | Its background |
| `--color-danger` | `#b3261e` | Field errors, inline error border and icon, "not recommended" level |
| `--color-danger-soft` | `#fce9e7` | Background of inline error and of the "not recommended" level |
| `--color-cost-depreciation` | `#0e4553` | Cost strip: depreciation |
| `--color-cost-fuel` | `#c2540a` | Cost strip: fuel and energy |
| `--color-cost-insurance` | `#6d4fc2` | Cost strip: insurance |
| `--color-cost-service` | `#1f8a5b` | Cost strip: servicing |
| `--color-cost-parts` | `#a3731a` | Cost strip: parts and wear |
| `--color-cost-fees` | `#6b7c85` | Cost strip: fees |
| `--color-scrim` | `rgb(8 47 57 / 0.55)` | Backdrop behind a sheet |

Variables in `@layer base` (`:root`): `--focus-ring: var(--color-brand)` (set to `var(--color-signal)` inside `[data-surface="dark"]`); `--bar-space: 0rem` (bottom padding of the footer; with a comparison bar `SiteShell` sets it to `var(--bar-height, 6.5rem)`). `--bar-height` is not a token: `CompareBar` measures its own closed height and writes it on `<html>`; `html:has([data-compare-bar="fixed"])` uses it as `scroll-padding-bottom: calc(var(--bar-height, 6.5rem) + 1rem)`.

### 3.2 Typography

Families (self-hosted WOFF2 in `src/components/ui/fonts/`, loaded with `next/font/local` in `src/components/ui/fonts.ts`, `display: swap`; licence SIL OFL 1.1, `fonts/OFL.txt`; files are subset to Basic Latin, Latin-1 and Latin Extended-A/B, which covers Polish):

| Token | Value | Use |
|---|---|---|
| `--font-sans` | `var(--font-barlow), ui-sans-serif, system-ui, sans-serif` | Body, labels, controls. Barlow 400, 500, 600 |
| `--font-display` | `var(--font-barlow-semi-condensed), var(--font-barlow), ui-sans-serif, system-ui, sans-serif` | Headings, car names, all amounts, logo. Barlow Semi Condensed 600 only |

Weights: `--font-weight-normal: 400` (text), `--font-weight-medium: 500` (labels, chips, navigation), `--font-weight-semibold: 600` (headings, amounts, buttons, selected states). No other weight and no italics are loaded.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.8125rem (13 px) | 1.125rem | Captions, hints, notes, markers |
| `--text-sm` | 0.875rem (14 px) | 1.25rem | Meta lines, field labels, chips, small buttons, footer |
| `--text-base` | 1rem (16 px) | 1.5rem (1.625rem in `Prose`) | Body, fields, buttons, table labels |
| `--text-lg` | 1.125rem (18 px) | 1.625rem | Intro paragraphs, car name in a row (line height 1.5rem), category amounts |
| `--text-xl` | 1.375rem (22 px) | 1.75rem | h3, ranked value (line height 1.5rem), sheet title, logo |
| `--text-2xl` | 1.75rem (28 px) | 2rem | h2, total in the comparison |
| `--text-3xl` | 2.25rem (36 px) | 2.5rem | h1 below 768 px, list price on the car page |
| `--text-4xl` | 3rem (48 px) | 3.125rem | h1 from 768 px, total cost on the car page |

Letter spacing: h1 and logo `-0.01em`, h2 `-0.005em`, everything else `0`. Headings use `text-wrap: balance`. Every amount, rank and count uses `tabular-nums`. Shared heading classes: `h1Class`, `h2Class`, `h3Class`, `fieldLabelClass`, `linkClass`, `panelClass` in `src/components/ui/styles.ts`.

### 3.3 Spacing

`--spacing: 0.25rem`; every spacing utility is a multiple (`p-4` = 1rem). Steps in use: 0.5 (2 px), 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20. Rules:

- Page side padding: 1rem below 768 px, 1.5rem from 768 px, 2rem from 1024 px (`Container`).
- Page top and bottom padding: `py-8 md:py-12` (car page `py-6 md:py-10`; 404 and error `py-12 md:py-20`).
- Between page sections: 3rem (`mt-12`) or 3.5rem (`mt-14`, home). Heading to its content: 1rem. Inside a panel: 1.25rem (`p-5`), 1rem on phones where stated.
- Between form fields: 1.25rem (`space-y-5`); between filter groups: 1.5rem (`space-y-6`); label to control: 0.375rem; control to message: 0.375rem.

### 3.4 Radii, borders, shadows, layout, z-index

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 0.25rem | Tags, segments of a switch, large cost strip, skeleton blocks |
| `--radius-md` | 0.5rem | Buttons, fields, popover |
| `--radius-lg` | 0.75rem | Panels, lists, tables, sheet top corners |
| (utility) `rounded-full` | pill | Filter chips, metric links, badges |
| (literal) `2px` | | Small cost strip, value bar, legend squares |
| `--shadow-popover` | `0 2px 6px -2px rgb(8 47 57 / 0.14), 0 12px 28px -8px rgb(8 47 57 / 0.24)` | Search popover, sheet as a drawer |
| `--shadow-raised` | `0 -2px 6px -2px rgb(8 47 57 / 0.12), 0 -12px 28px -10px rgb(8 47 57 / 0.22)` | Comparison bar, bottom sheet (shadow cast upward) |
| `--container-page` | 75rem | Maximum content width (`max-w-page`) |
| `--container-prose` | 42rem | Text measure (`max-w-prose`) |
| `--container-lg` / `--container-3xl` / `--container-4xl` | 32rem / 48rem / 56rem | Container-query steps (`@lg`, `@3xl`, `@4xl`) |

Borders are 1 px. Static content has no shadow: panels are `border border-line bg-surface rounded-lg` (`panelClass`). Only layers above the page cast a shadow.

z-index (plain utilities, no theme variables): `10` comparison toggle above the row link, sticky comparison header; `30` comparison bar; `40` search popover; `50` skip link. Sheets use the browser top layer (`<dialog>`).

### 3.5 Breakpoints

| Token | Value | What changes |
|---|---|---|
| `--breakpoint-sm` | 40rem (640 px) | Link list 2 columns; car attributes 3 columns; comparison bar action gains its icon and the disabled idle action appears |
| `--breakpoint-md` | 48rem (768 px) | Header on one line; metric selector becomes links; comparison becomes a classic table; sheet becomes a right drawer; h1 48 px |
| `--breakpoint-lg` | 64rem (1024 px) | Filters sidebar; assumptions aside on the car page; home lists side by side; link list 3 columns; the closed comparison bar shows the selected cars in one row |
| `--breakpoint-xl` | 80rem (1280 px) | Car attributes 4 columns |

### 3.6 Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Colour changes on hover, focus, press, selection |
| `--duration-base` | 200ms | Reserved for transitions of page content (the components themselves use none) |
| `--duration-slow` | 280ms | Sheet enter and exit, backdrop fade |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Sheet, strip |
| `--animate-strip-grow` | `strip-grow 640ms var(--ease-out-expo) both` | Large cost strip grows from the left once (car page) |
| `--animate-skeleton` | `skeleton-pulse 1400ms ease-in-out infinite` | Skeleton opacity 1 to 0.5 |

## 4. Contrast table

Ratios computed with the WCAG 2.x relative-luminance formula from the token values (all colours are opaque, so rendered pairs equal token pairs). Required: 4.5:1 text, 3:1 large text, component boundaries and focus indicators.

### 4.1 Text

| Foreground | Background | Ratio | Where |
|---|---|---|---|
| ink | ground | 15.32 | Headings and body on the page |
| ink | surface | 16.93 | Panels, fields, lists |
| ink | sunken | 14.19 | Indicative tag |
| ink | brand-soft | 15.13 | Hovered row, total band |
| ink | brand-tint | 13.04 | Selected chip, active search option |
| ink | positive-soft / caution-soft / danger-soft | 14.59 / 14.95 / 14.47 | Income ranges, inline error |
| ink-muted | ground | 6.56 | Captions and notes on the page, `InfoNote` text |
| ink-muted | surface | 7.25 | Meta lines, hints, placeholders, units |
| ink-muted | sunken | 6.08 | Disabled controls (exempt, still passes) |
| ink-muted | brand-soft | 6.48 | Meta line in a hovered row |
| ink-muted | brand-tint | 5.59 | Count in a selected chip, meta in the active option |
| ink-muted | positive-soft / caution-soft / danger-soft | 6.25 / 6.40 / 6.20 | Notes in the earnings scale |
| brand | ground | 7.25 | Links on the page |
| brand | surface | 8.01 | Links in panels, text buttons |
| brand-strong | ground | 9.52 | Text button on the page, hover |
| brand-deep | ground | 12.87 | Text button on the page, pressed |
| brand | brand-soft | 7.16 | "Reasonable" label |
| brand-strong | surface | 10.53 | Selected language |
| brand-strong | brand-tint | 8.11 | Tick in a selected chip |
| on-brand | brand | 8.01 | Primary button, selected segment, current metric |
| on-brand | brand-strong | 10.53 | Header, hero, car entries in the comparison bar, car number in the narrow comparison |
| on-brand | brand-deep | 14.23 | Footer, comparison bar |
| on-brand-muted | brand-strong | 7.30 | Hero intro; attributes and remove icon of a car entry in the comparison bar |
| on-brand-muted | brand-deep | 9.87 | Footer text, comparison bar hint, chevron of the bar's disclosure button |
| on-signal | signal | 9.78 | Signal button, badge, skip link |
| on-signal | signal-strong | 8.25 | Signal button hover |
| positive | positive-soft | 6.03 | "Lowest" mark, "comfortable" label |
| caution | caution-soft | 6.29 | "Stretching it" label |
| danger | danger-soft | 5.59 | "Not recommended" label |
| danger | surface | 6.54 | Field error text |
| danger | ground | 5.91 | Field error text of a field placed on the page |

Measured on 25 preview pages in both languages at 375 and 1280 px (computed colour of every text node against its nearest opaque background): 34 distinct pairs are rendered, all listed above, lowest 5.59.

### 4.2 Component boundaries, graphics and focus

| Foreground | Background | Ratio | Where |
|---|---|---|---|
| line-strong | surface | 3.80 | Field, secondary button, chip and switch borders |
| line-strong | ground | 3.44 | The same controls placed on the page |
| line-strong | sunken | 3.19 | Grey segments of an emphasised strip on its track |
| line-strong | positive-soft / brand-soft / caution-soft / danger-soft | 3.27 / 3.40 / 3.36 / 3.25 | Empty bars of the scale meter |
| danger | surface | 6.54 | Invalid field border |
| brand (focus ring) | ground / surface / brand-soft / brand-tint | 7.25 / 8.01 / 7.16 / 6.17 | Focus on light surfaces |
| signal (focus ring) | brand-strong / brand-deep | 6.08 / 8.21 | Focus on dark surfaces |
| signal | brand-strong | 6.08 | Current-page underline in the header |
| signal | brand-deep | 8.21 | Alert icon of the limit message in the comparison bar |
| on-brand-muted | brand-strong | 7.30 | Outline of the language switcher |
| brand | sunken | 6.71 | Value bar on its track |
| cost-depreciation | surface / sunken | 10.53 / 8.82 | Strip segment against gap and track |
| cost-fuel | surface / sunken | 4.60 / 3.85 | |
| cost-insurance | surface / sunken | 5.92 / 4.96 | |
| cost-service | surface / sunken | 4.33 / 3.63 | |
| cost-parts | surface / sunken | 4.18 / 3.50 | |
| cost-fees | surface / sunken | 4.33 / 3.63 | |

Not boundaries (decorative, below 3:1 on purpose): `line` on surface 1.39 (panel hairlines and row dividers; structure is also given by spacing and headings); car entries in the comparison bar, `brand-strong` on `brand-deep` 1.35 (each entry is identified by its text and remove button). Adjacent strip segments are separated by a 2 px `surface` gap, so no segment relies on contrast with its neighbour; amounts are always printed as text beside the strip.

## 5. Component inventory

All components are presentational: texts arrive as props already translated and formatted. `demo` props (and the `data-demo` attribute) exist only so the preview can show hover, focus and pressed states; never pass them in production. "Preview" names the page under `/design-preview/` where the state is visible.

### 5.1 Layout: `src/components/layout/SiteShell.tsx`

| Export | Props | Description and states |
|---|---|---|
| `SiteShell` | `skipLabel`, `header`, `footer`, `compareBar?`, `children` | Column `min-h-dvh`: skip link, header, `<main id="main" tabIndex={-1}>`, footer, comparison bar. With `compareBar` it reserves `--bar-space` (the measured height of the bar) under the footer. |
| `SkipLink` | `children` | First focusable element. Hidden until focused; then fixed top-left 0.5rem, amber, 44 px high. Preview: components. |
| `Container` | `children`, `className?` | `max-w-page`, side padding 1 / 1.5 / 2rem. |
| `Header` | `locale: "pl" \| "en"`, `pathname`, `nav: NavItem[]`, `labels: { homeLink, nav, language, languageNames }` | `brand-strong`. Below 768 px two rows: logo (52 px row) and language switcher, then navigation (44 px links, flush left). From 768 px one 64 px row. Nav item states: default (weight 500), hover (3 px `on-brand-muted` underline at the bottom edge), current (`aria-current="page"`, weight 600, 3 px amber underline), focus (amber ring inside). `NavItem.badge` shows an amber count pill (cars in the comparison) with `badgeLabel` for screen readers. |
| Language switcher (in `Header`) | | Two links "PL" / "EN", each 40 x 32 px (44 x 44 on touch), inside a 1 px `on-brand-muted` outline. Current: white fill, `brand-strong` text, `aria-current="true"`. Hover: `brand` fill. Each link has `lang`, `hrefLang` and a hidden full language name. Keeps the current path. |
| `Footer` | `nav`, `labels: { about, nav, sourcesTitle, sources[], disclaimer }`, `children?` | `brand-deep`. Three columns from 768 px (about, links, data sources), stacked below. Bottom block: disclaimer and the slot for `<DataFreshness tone="dark">`. Links underlined, 36 px high (44 on touch). |

### 5.2 Controls

| Component (file in `src/components/ui/`) | Props | Variants, sizes, states |
|---|---|---|
| `Button`, `ButtonLink`, `buttonClass` (`Button.tsx`) | `variant?: "primary" \| "secondary" \| "text" \| "signal"`, `size?: "md" \| "sm"`, `icon?: IconName`, `loading?`, `disabled?`, `children`; `ButtonLink` takes `href` instead of button attributes | md: min height 44 px, padding 0 1.25rem, 16 px text. sm: 36 px (44 on touch), padding 0 0.75rem, 14 px. Radius md, weight 600, icon 20 px (16 in sm), gap 0.5rem. **primary**: `brand` / hover `brand-strong` / active `brand-deep`. **secondary**: `surface`, 1 px `line-strong` / hover `brand` border + `brand-soft` / active `brand-tint`. **text**: `brand`, underlined 1 px, offset 3 px / hover `brand-strong`, 2 px underline / active `brand-deep`; side padding 0.5rem (md), 0.25rem (sm). **signal** (dark surfaces only): `signal` / hover and active `signal-strong`. Disabled: `sunken` fill, `ink-muted` text, `line` border (secondary), `not-allowed` cursor; signal disabled: `brand-strong` fill, `on-brand-muted` text. Loading: spinner replaces the icon, `aria-busy`. Focus: ring (section 8). Preview: components. |
| `TextField`, `NumberField`, `Select` (`Fields.tsx`) | `id`, `label`, `hideLabel?`, `hint?`, `error?`, `className?` + native attributes; `TextField`: `leadingIcon?`, `unit?`, `numeric?`; `Select`: `children` (options) | Box 44 px high, radius md, 1 px `line-strong`, `surface`; text 16 px, padding 0 0.75rem. Label 14 px / 500 above, gap 0.375rem. Unit 14 px `ink-muted` inside on the right. Select: native, chevron 20 px at right 0.75rem. Hover: `brand` border. Focus: ring on the box (`.field-box:focus-within`). Invalid (`error` set): 2 px `danger` border (1 px border + 1 px inset shadow), `aria-invalid`, message under the field with the alert icon in `danger` 14 px, linked by `aria-describedby`. Hint: 13 px `ink-muted`. Disabled: `sunken`, `line` border, `ink-muted`. `NumberField` = text input with `inputMode="numeric"` and tabular figures (no spinner arrows). Preview: components. |
| `SegmentedSwitch` (`Choice.tsx`) | `name`, `legend`, `hideLegend? = true`, `options: { value, label }[]`, `value?` / `defaultValue?`, `onChange?(value)`, `fullWidth?` | Radio group in a `<fieldset>`. Container 44 px high (1 px `line-strong`, radius md, 3 px padding); segment 36 px, radius sm, 14 px / 500, padding 0 0.875rem (`fullWidth`: equal columns). Selected: `brand` fill, white, 600. Hover: `brand-soft`. Focus: ring on the segment. Arrow keys move the selection (native). Used for month / year, insurance mode, coverage, gearbox. Preview: components, rankings, car. |
| `FilterChip` (`Choice.tsx`) | `name`, `value`, `checked?` / `defaultChecked?`, `disabled?`, `onChange?(checked)`, `count?`, `children` | Checkbox drawn as a pill: 40 px high (44 on touch), padding 0 0.875rem, 14 px / 500, 1 px `line-strong`. Hover: `brand` border, `brand-soft`. Active (checked): `brand-tint`, 2 px `brand` border, tick icon before the label. Disabled: `sunken`, `line` border, `ink-muted`. Count after the label in `ink-muted`. Preview: components, rankings (sidebar, sheet). |
| `CheckboxRow` (`Choice.tsx`) | as `FilterChip` | Native 20 px checkbox (`accent-color: brand`) + label on a 40 px row (44 on touch), count on the right. Hover `brand-soft`; checked label 600; focus ring inside the row; disabled `ink-muted`. Used for the list of makes. Preview: components, rankings. |
| `SearchCombobox` (`SearchCombobox.tsx`, client) | `labels: { label, placeholder, clear, noResultsTitle, noResultsHint, loading }`, `options: SearchOption[]` (`id`, `href`, `title`, `meta: ReactNode`, normally `<CarMeta>`, `trailing?`), `query?` / `defaultQuery?`, `onQueryChange?`, `onSelect?`, `statusText?`, `loading?`, `size?: "md" \| "lg"`, `className?` | Field 44 px (md) or 56 px (lg, home hero), search icon left, clear button right when text is present. **Closed**; **keyboard focus** (ring on the box); **open with results**: popover 0.5rem below, `surface`, radius md, `shadow-popover`, max height 22rem, at most 8 options, each at least 52 px, top-aligned: name 16 px / 500 printed in full (wraps, never truncated), attributes 13 px (body type, fuel, gearbox, power: two cars can share a name), price right in display 600; active option `brand-tint` with a 2 px inset `brand` outline; **no results**: title 16 px / 600 + hint 14 px; **loading**: one line of text. Behaviour: WAI-ARIA combobox with list autocomplete; Down / Up move (wrapping), Home / End, Enter opens the active option, Escape closes the list and, pressed again, clears the field; pointer hover sets the active option; a polite live region announces `statusText`. Default selection action: navigate to `option.href`. Preview: components (all four states), home, compare-empty, not-found. |
| `MetricSelector` (`MetricSelector.tsx`) | `metrics: { key, label, href }[]`, `current`, `labels: { label }`, `onSelectChange?(key)`, `id?` | Below 768 px: a labelled native `Select`. From 768 px: `<nav>` with a wrapping row of pill links, 40 px high, padding 0 1rem, 14 px / 500, gap 0.5rem; current: `brand` fill, white, 600, `aria-current="page"`; hover: `brand` border, `brand-soft`. Preview: rankings, components. |
| `LinkList` (`MetricSelector.tsx`) | `items: { href, title, description }[]`, `label` | The nine rankings on the home page: one bordered panel divided by hairlines, 1 / 2 / 3 columns (base / 640 / 1024 px). Cell min height 72 px, padding 1rem 1.25rem; title display 18 px / 600, description 14 px `ink-muted`. Hover: `brand-soft`, title underlined. Focus ring inside the cell. Preview: home. |
| `CompareToggle` (`CompareToggle.tsx`) | `pressed`, `labels: { add, added, fullHint }`, `carName`, `full?`, `size?: "sm" \| "md"`, `describedBy?`, `showHint?` + button attributes | Toggle button (`aria-pressed`). sm 36 px (44 on touch), md 44 px. Off: plus icon + "Porównaj", secondary look. On (in comparison): tick + "W porównaniu", `brand` fill. **Full** (3 cars chosen, this one is not): disabled look (`sunken`, `line` border, `ink-muted`), `aria-disabled`, stays focusable. The reason is always readable text, never a `title`: in a list pass `describedBy={COMPARE_BAR_HINT_ID}`, the button then points to the hint line of the comparison bar, which is visible at every width; for a toggle that stands alone (car page) pass `showHint`, which prints `fullHint` under the button (info icon 16 px + 14 px `ink-muted`, max 28rem, linked with `aria-describedby`). Activating a full toggle adds nothing: the caller sets `notice` on `CompareBar`. Accessible name includes the car name. Preview: components (ranking item, compare toggle), rankings, rankings-full, car, car-long-name. |
| `Sheet`, `SheetDisclosure` (`Sheet.tsx`, client; styles `.sheet` in `globals.css`) | `Sheet`: `open`, `onClose`, `title`, `closeLabel`, `children`, `footer?`. `SheetDisclosure`: `triggerLabel`, `triggerIcon?`, `triggerVariant?`, `triggerSize?`, `badge?`, `title`, `closeLabel`, `applyLabel?`, `children` | Modal `<dialog>`. Below 768 px a bottom sheet: full width, max height 90dvh, top radius lg, `shadow-raised`. From 768 px a right drawer: 26rem wide, full height, `shadow-popover`. Header 60 px: title (display 22 px) and a 44 px close button; scrolling body padding 1.25rem; optional pinned footer with a full-width primary button. Backdrop `scrim`. Closes with Escape, the close button, the footer button or a click on the backdrop; focus returns to the trigger (native dialog). `badge` shows a count pill on the trigger (active filters). Preview: rankings-filters-open, rankings-assumptions-open. |

### 5.3 Data display

| Component | Props | Description and states |
|---|---|---|
| `CostStrip` (`CostStrip.tsx`); also `COST_ORDER`, `COST_FILL`, `ValueBar` | `shares: Partial<Record<CostKey, number>>`, `size?: "sm" \| "lg"`, `ratio? = 1`, `emphasis?: CostKey`, `animate?`, `label?` | The signature element. Segments in the fixed order depreciation, fuel, insurance, service, parts, fees, 2 px `surface` gaps, each at least 2 px wide. sm: 8 px high, radius 2 px (lists, comparison header). lg: 24 px, radius sm (car page). `ratio` = length relative to the longest strip in the list, on a `sunken` track. `emphasis` keeps one category in colour and greys the rest (`line-strong`) for single-category rankings. `animate` plays `strip-grow` once. Decorative (`aria-hidden`) unless `label` is given. `ValueBar { ratio }`: 8 px single `brand` bar for rankings by one number. Preview: components, home, rankings, car, compare. |
| `CostBreakdown` (`CostBreakdown.tsx`) | `items: CostBreakdownItem[]` (`key`, `label`, `amount`, `share`, `shareText`), `total`, `labels: { caption, category, amount, share, total, estimateSr }`, `animate?`, `footer?` | Large strip, then a table: one row per category (12 px colour square, label 16 px, amount display 18 px / 600 with "≈", share 14 px `ink-muted`), rows divided by `line`, 0.75rem vertical padding. Total row above a 2 px `ink` rule, amount 22 px. `footer` holds the residual-value and cost-per-kilometre sentences (14 px). Preview: car. |
| `RankingItem`, `RankingList` (`RankingItem.tsx`) | `rank`, `href`, `name`, `meta: ReactNode` (normally `<CarMeta>`), `detail?`, `value`, `valueCaption`, `estimate?`, `estimateSrLabel?`, `bar?: { kind: "strip", ratio, shares, emphasis? } \| { kind: "value", ratio }`, `action?` (slot for `CompareToggle`); `RankingList`: `label`, `children` | `RankingList` is an `<ol>` panel with hairline dividers and a container query. Row padding 1rem (1rem 1.25rem wide). **Narrow** (list under 48rem), grid `1.75rem / 1fr / auto`: line 1 rank and the name on the full width (display 18 px / 600, printed in full); line 2 attributes 14 px left and the value right (display 22 px / 600) with a 13 px caption; then the bar (0.625rem above); then detail left and the toggle right. **Wide** (48rem or more): one line, columns `2.25rem / 1fr / 8.5rem / 9.5rem`; name, attributes, detail and bar stacked in the second column, value and toggle centred vertically. The whole row is the link (stretched over the row); the toggle sits above it. States: default; hover `brand-soft` and underlined name; focus (ring inside the row); in comparison (toggle pressed); comparison full (toggle disabled). Preview: components, rankings, rankings-long-names, home, home-long-names. |
| `ComparisonTable` (`ComparisonTable.tsx`) | `cars: ComparisonCar[]` (2 or 3; `slug`, `href`, `make`, `variant`, `meta: ReactNode`, `shares`), `rows: ComparisonRow[]` (`key`, `label`, `values[]`, `best: number \| null`, `bestLabel`, `notes?: (string \| null)[]`, `estimate?`, `emphasis?`, `groupStart?`), `labels: { caption, rowHeader, remove, removeShort, estimateSr, cars }`, `onRemove?(slug)`, `footer?` | Panel. **From 768 px:** fixed-layout table, label column 13rem (15rem from 1024 px), car columns equal; header cell (padding 1.25rem): name link printed in full (display 18 px / 24 px, from 1024 px 22 px / 28 px), attributes 14 px, small strip, "Usuń" at the bottom; rows 0.75rem 1.25rem, values display 18 px / 600; `groupStart` and the total row have a `line-strong` rule; total row (`emphasis`): `brand-soft` band, 28 px figures. **Below 768 px:** first an ordered list of the cars, one per row on the full width (padding 0.75rem 1rem, hairlines between): number in a 24 px `brand-strong` square, name link printed in full (display 18 px / 24 px, at least 24 px high), attributes 14 px, small strip, and an icon-only remove button on the right (32 px, 44 on touch). Then the table: its header is sticky at the top and is only a key, each cell holding the car's number (20 px square) and the start of its name (13 px / 600, at most 2 lines); the row label sits on its own line above the values, so 3 cars fit in 320 px; values 16 px (total 18 px). Best value: tick + word ("najniżej" / "najwyżej") in `positive` on `positive-soft`, beside the value (below it on phones); no mark on ties or when values are not comparable. `notes`: 13 px `ink-muted` line under a value (kind of power). "–" in `ink-muted` when a value does not apply. `footer`: slot under the table (hairline above, padding 0.75rem 1rem, 1.25rem from 768 px) for an `InfoNote`. Preview: compare (3 cars), compare-2-cars, compare-long-names. |
| `CompareBar` (`CompareBar.tsx`, client); also `COMPARE_BAR_HINT_ID` | `cars: { slug, name, meta: ReactNode }[]` (0 to 3), `compareHref`, `labels: { region, toggle, count, list, compare, compareIdle, needMore, empty, full, remove, clear }`, `notice?`, `onRemove?`, `onClear?`, `position?: "fixed" \| "static"`, `showWhenEmpty?`, `defaultExpanded?` (preview) | `<aside>` on `brand-deep`, fixed to the bottom edge (safe-area padding), `shadow-raised`, z 30, padding 0.5rem 1rem (side 1.5 / 2rem from 768 / 1024 px). One pattern at every width. **Closed:** a disclosure button with the count ("Wybrane: 2 z 3", display 18 px / 600, 44 px high, chevron 20 px, `aria-expanded`, `aria-controls`), the action on the right (signal button, 44 px; below 640 px without icon and with 1rem side padding), and under them the hint line (13 px `on-brand-muted`, `id="compare-bar-hint"`, `role="status"`). From 1024 px the closed bar also shows the selected cars in one row between count and action (equal columns, gap 0.5rem), followed by "Wyczyść". **Open** (button pressed): the list of cars appears above the count row, 1 column below 768 px and equal columns from 768 px, max height 60dvh with its own scroll, then "Wyczyść" (text button, 44 px) on its own line. **Car entry:** `brand-strong` box, radius md, padding 0.375rem 0.25rem 0.375rem 0.75rem; name 14 px / 600 white, cut to one line with an ellipsis in the closed row and printed in full in the open list; attributes 13 px `on-brand-muted`, always wrapping in full; remove button 32 px (44 on touch) with the close icon, hover `brand`. The open list closes on Escape (focus returns to the button), on a second press, and when focus leaves the bar. **0 cars**: not rendered (with `showWhenEmpty`: plain count text, hint, disabled action). **1 car**: hint "add one more", disabled action from 640 px. **2 cars**: action "Porównaj 2 auta", no hint. **3 cars (full)**: hint "Komplet…", action "Porównaj 3 auta". **Limit message:** with `notice` the hint line shows that text in white / 600 with a 16 px `signal` alert icon and is announced (`role="status"`). While fixed and closed the bar writes its height to `--bar-height` on `<html>` (section 8). Preview: components (closed 0 to 3, open 1 to 3, limit message), rankings, rankings-full, car, compare. |
| `EarningsScale` (`EarningsScale.tsx`) | `levels: EarningsLevel[]` (always 4: `level`, `label`, `range`, `note`) | Ordered list of four blocks, 2 px gaps, radius lg; 1 column, 2 columns from a 32rem container, 4 from 56rem. Each block: meter (4 bars, 1 to 4 filled: how heavily the car weighs on the budget) + label in the level colour (display 18 px / 600), income range (display 18 px, 22 px in columns), note 13 px. Levels: comfortable `positive` on `positive-soft`; reasonable `brand` on `brand-soft`; stretch `caution` on `caution-soft`; not_recommended `danger` on `danger-soft`. Meaning is carried by label and meter, colour is third. Preview: car, components. |
| `Estimate`, `EstimateNote`, `InfoNote`, `IndicativeTag`, `PriceDate`, `DataFreshness` (`Markers.tsx`) | `Estimate { children, srLabel }`; `EstimateNote { children }`; `InfoNote { children }`; `IndicativeTag { children }`; `PriceDate { label, isoDate, dateText, children? }`; `DataFreshness { children, tone?: "light" \| "dark" }` | **Estimate marker**: "≈" in `ink-muted`, weight 400, before the amount; screen readers hear `srLabel` ("około" / "about"). **EstimateNote**: one 13 px line per screen explaining the sign, with a link to the methodology. **InfoNote**: a note on how to read the data of a screen: 16 px info icon in `ink` + 14 px `ink-muted` text, max 42rem, may contain a link; static text, no live-region role. Two uses: under the fuel-consumption ranking (which cars it leaves out), on the car page (the entry stands for several versions); also the power note under the comparison. **Indicative price marker**: text tag, 24 px high, `sunken`, 13 px / 500, radius sm; in lists the words appear as the caption under the price instead. **Price date**: 13 px line "Cennik z `<time>`" + optional source link. **Data freshness**: refresh icon + sentence with `<time>` elements; lives in the footer of every page. Preview: components, car, home. |
| `EmptyState`, `InlineError`, `Skeleton`, `RankingListSkeleton`, `CarPageSkeleton`, `ComparisonSkeleton` (`Feedback.tsx`) | `EmptyState { title, children, actions?, headingLevel? }`; `InlineError { title, children, action? }`; skeletons `{ label }` (+ `rows?`, `columns?: 2 \| 3`) | **Empty**: panel with a dashed `line-strong` border, title display 28 px, text 16 px `ink-muted`, actions row; no illustration. **Inline error**: `role="alert"`, `danger-soft` with a 1 px `danger` border, alert icon, title 16 px / 600, text 14 px, retry button. **Skeletons**: `sunken` blocks with the sizes of the real layout, pulse animation, wrapper `role="status"` + `aria-busy` with a hidden label. Preview: components, rankings-empty, rankings-error, rankings-loading, compare-empty, compare-1-car, compare-loading. |
| `AssumptionsPanel`, `AssumptionsSummary` (`AssumptionsPanel.tsx`) | Panel: `idPrefix`, `labels: AssumptionsLabels`, `values: AssumptionValues`, `errors?: { annualMileageKm?, annualPremiumPln? }`, `onChange?(field, value)`. Summary: `label`, `summary`, `action` | Panel: mileage (`NumberField`, unit km, hint), ownership period (`Select`, 1 to 10 years), rule, insurance mode (`SegmentedSwitch`: estimate / own premium); estimate shows driver age (`Select`, nine bands) and coverage (`SegmentedSwitch`: OC / OC + AC); own premium shows one `NumberField` (unit zł, hint). Summary: one-line panel with the gauge icon, "Założenia: …" and the "Zmień" button that opens the panel in a `Sheet`. Preview: components (both modes, with errors), car (aside), rankings-assumptions-open. |
| `FiltersPanel`, `ActiveFilters` (`FiltersPanel.tsx`) | Panel: `idPrefix`, `labels: FiltersLabels`, `query?`, `priceMin?`, `priceMax?`, `priceError?`, `transmission?`, `bodyTypes`, `fuelTypes`, `segments`, `makes` (`FilterOption[]`: `value`, `label`, `count?`, `selected?`, `disabled?`), `onTextChange?`, `onTransmissionChange?`, `onToggle?(group, value, checked)`. Active: `items: { key, label }[]`, `labels: { list, remove, clear }`, `onRemove?`, `onClear?` | Panel order: text query, price from / to (two fields side by side, shared error line), body type chips, powertrain chips, gearbox switch (any / manual / automatic), segment chips, makes (scrolling list of `CheckboxRow`, max height 16rem). An option with no cars is disabled, not hidden. `ActiveFilters`: row of removable `brand-tint` chips (36 px, 44 on touch) and a "Wyczyść filtry" text button; renders nothing when no filter is on. Preview: rankings (sidebar, chips row), rankings-filters-open. |
| `Prose`, `Notice`, `DataTable` (`Prose.tsx`) | `Prose { children }`; `Notice { title, children }`; `DataTable { caption, columns, rows }` | **Prose**: measure 42rem, 16 px / 26 px, h2 28 px with 3rem above and 0.75rem below, h3 22 px, lists, links in `brand` underlined. **Notice** (disclaimers): bordered box (`line-strong`), title display 18 px, text 14 px. **DataTable**: bordered table with a visible caption, header band on `ground`; below its 40rem minimum width it scrolls sideways inside its own focusable region, the page does not. Preview: methodology. |
| `CarName`, `nameWrapClass` (`CarName.tsx`) | `CarName { children: string }` | Prints a car name in full and adds a line-break opportunity (`<wbr>`) after every "/", so names such as "Longitude/Limited/High Altitude/S" break between trim levels. The element around it carries `nameWrapClass` (`overflow-wrap: anywhere`), which lets any other long token break and keeps the name from widening a table column or flex item. Used by every component that prints a name (section 7.1). |
| `CarMeta`, `PowerLabel`, `PowerDetail` (`CarMeta.tsx`) | `CarMeta { attributes: string[], power: { short, full } }`; `PowerLabel { short, full }`; `PowerDetail { value, note? }` | **CarMeta**: the attribute phrase that accompanies a name everywhere: body type, powertrain, gearbox, then the power label, joined by commas; wraps between attributes, never truncated. **PowerLabel** (short form): the short text is shown (`aria-hidden`), the full text is read instead (visually hidden); it never breaks inside. **PowerDetail** (full form, value of the power attribute): figure 16 px / 500 and under it a 13 px `ink-muted` explanation with a link to the methodology. Texts and rules: section 9.9. Preview: components (power labels), car, car-electric, car-long-name, compare. |
| `Icon` (`Icon.tsx`) | `name: IconName`, `size?: 16 \| 20 \| 24` | One set drawn for WheelWise: 24 px grid, 1.75 px stroke, round caps, no fills. Names: `search`, `chevron-down`, `chevron-right`, `arrow-left`, `check`, `plus`, `close`, `sliders`, `gauge`, `external`, `info`, `alert`, `compare`, `refresh`. Always `aria-hidden`. |
| `Logo`, `LogoMark` (`Logo.tsx`), `src/app/icon.svg` | `Logo { tone?: "on-brand" \| "brand" }`, `LogoMark { size? = 28 }` | Mark: a wheel rim drawn as a cost ring, five sixths in the text colour, one sixth amber, with a hub dot. Wordmark "WheelWise" in Barlow Semi Condensed 600, 22 px, `-0.01em`, `translate="no"`. Site icon: the mark in white and amber on a `brand-strong` rounded square. |
| `format.ts` | `formatInteger`, `formatPln`, `formatPlnExact`, `formatDecimal`, `formatPercent`, `formatDate` (`value`, `locale`) | Section 10. |

## 6. Screen specifications

Common frame: `SiteShell` with `Header` and `Footer`; content inside `Container`. h1 uses `h1Class`. The comparison bar appears on every page while 1 to 3 cars are selected. Wherever a car name appears, its attributes (body type, powertrain, gearbox, power) appear with it.

### 6.1 Home (`/`; preview `home`)

1. Hero band on `brand-strong` (`data-surface="dark"`), padding 2rem 0 2.5rem (3.5rem 0 4rem from 768 px), content max width 42rem, left aligned: h1 (white), intro 18 px `on-brand-muted`, `SearchCombobox size="lg"` 1.5rem below.
2. Two ranked lists, each a section with h2, a one-line description, `RankingList` of 5 and a link to the full ranking (44 px high): "cheapest to buy" (`ValueBar`, value = indicative price, caption "cena orientacyjna", no toggle) and "lowest total cost" (`CostStrip`, value with "≈", caption "miesięcznie", no toggle, no detail line). One column below 1024 px (gap 3rem), two equal columns from 1024 px (gap 2rem).
3. "All rankings": h2 + `LinkList` with the nine metrics, 3.5rem above.
4. `EstimateNote`, 2rem above. The data freshness line is in the footer.

States: lists loading: `RankingListSkeleton rows={5}`; a list failing: `InlineError` in its place; the rest of the page stays.

### 6.2 Rankings (`/rankings`; preview `rankings`, `rankings-filters-open`, `rankings-assumptions-open`, `rankings-empty`, `rankings-error`, `rankings-loading`, `rankings-consumption`, `rankings-full`, `rankings-long-names`)

1. h1, then `MetricSelector` (1.5rem below).
2. Grid 1.5rem below: from 1024 px a 17.5rem filters sidebar (panel, padding 1.25rem, h2 "Filtry", `FiltersPanel`) and the list column, gap 2rem. Below 1024 px the sidebar is hidden.
3. List column, top to bottom: `AssumptionsSummary` with "Zmień" (opens the assumptions `Sheet` at every width); 1.5rem; title row: h2 "{metric}, {period}" with the car count under it (`aria-live="polite"`), and on the right the "Filtry" button (below 1024 px only; opens the filters `Sheet`, badge = number of active filters) and the month / year `SegmentedSwitch`; the right group wraps under the title when it does not fit; 1rem; `ActiveFilters`; 1rem; `RankingList` of 10 with a `CompareToggle` on each row; 1.25rem; "Pokazano 10 z 287" left and the secondary button "Pokaż kolejne 10" right; 1.5rem; `EstimateNote` (cost metrics) or the consumption note (below).

For `price` and `fuelConsumption` the list title is the metric name alone and the month / year switch is not rendered: these values do not depend on the period.

Fuel-consumption ranking: under the list an `InfoNote` says what the ranking leaves out. Default text: litres per 100 km, no plug-in hybrids, electric cars only when "electric" is the only selected powertrain. When that filter is on, the second text replaces it (kWh per 100 km). Texts: section 9.4.

Comparison full: the toggles of the other cars are disabled and point to the bar's hint line; after an attempt to add a fourth car the bar shows the limit message (preview `rankings-full`).

Mobile pattern for filters and assumptions: both are bottom sheets (90dvh max, scrolling body, pinned footer button: "Pokaż 287 aut" for filters, "Gotowe" for assumptions). Changes apply immediately; the footer button only closes the sheet. From 768 px the same sheets are right-hand drawers.

Bars: metrics `totalCost` and `maintenance` use the full `CostStrip`; `depreciation`, `fuelCost`, `insurance`, `service`, `parts` use `CostStrip` with `emphasis` on that category; `price` and `fuelConsumption` use `ValueBar`. `ratio` = value / largest value in the visible list. Captions under the value: "miesięcznie" / "rocznie" for costs, "cena orientacyjna" for price, "WLTP" for consumption. Values of `price` and `fuelConsumption` carry no "≈".

States: empty (`EmptyState`, h3, action "Wyczyść filtry"; count reads "0 aut"); error (`InlineError` with retry; filters and assumptions stay); loading (`RankingListSkeleton`).

### 6.3 Car details (`/cars/[slug]`; preview `car` petrol, `car-electric`, `car-long-name` hybrid with the comparison full)

Grid from 1024 px: content column + 22rem aside, gap 2.5rem. Below 1024 px one column and no aside.

Content column: back link to rankings (44 px high); h1 = make + variant, printed in full (`CarName`, `nameWrapClass`); price block 1.5rem below: price (display 36 px) + `IndicativeTag`, a 14 px explanation (max 28rem), `PriceDate` with the source link (opens in a new tab, external icon), then 1rem below the several-versions notice (`InfoNote`, max 28rem, on every car page); `CompareToggle size="md" showHint` 1.25rem below (when the comparison is full and this car is not in it, the reason is printed under the button); attributes as a `<dl>` grid (2 / 3 / 4 columns at base / 640 / 1280 px; term 13 px `ink-muted`, value 16 px / 500; hairlines), in the order body type, segment, powertrain, gearbox, power, engine size, consumption. The power attribute uses the full power label (section 9.9): its term is the full label, its value is `PowerDetail`; when it has an explanation (hybrid, plug-in hybrid, electric) the cell spans 2 columns; section "Koszt posiadania": h2 with the month / year switch on the right, `AssumptionsSummary` (below 1024 px only), panel with the total (display 48 px with "≈"), the line "{period}, licząc {n} lat posiadania" and `CostBreakdown animate`; `EstimateNote`; section "Jakie zarobki na to auto": h2, one sentence, `EarningsScale`.

Aside (from 1024 px): sticky panel (top 1.5rem) with h2 "Założenia" and `AssumptionsPanel`.

States: loading `CarPageSkeleton`; unknown slug: the 404 page; cost calculation impossible (missing market price): `InlineError` in place of the cost panel, identity and price stay.

### 6.4 Comparison (`/compare`; preview `compare`, `compare-2-cars`, `compare-long-names`, `compare-1-car`, `compare-empty`, `compare-loading`)

h1 with the month / year switch on the right (wraps under the h1 on phones); `AssumptionsSummary`; `ComparisonTable`; `EstimateNote`. With 2 cars, a section "Dodaj trzecie auto" with a `SearchCombobox` (max width 28rem) follows.

Rows, in order: indicative price (lowest marked; no "≈"); depreciation (starts a group), fuel and energy, insurance, servicing, parts and wear, fees (lowest marked, "≈"); total (emphasis band, lowest marked); value after n years (starts a group; highest marked); consumption (lowest marked only when all cars use the same unit and none is a plug-in hybrid); power (full value "67 kW (91 KM)", under it the kind of power for hybrids and electric cars, never a best mark).

When at least one car is a hybrid, plug-in hybrid or electric car, the table footer holds an `InfoNote` about power with a link to the methodology.

Mobile layout (below 768 px): the list of cars with whole names and attributes first, then three (or two) equal columns inside the panel with the sticky key header (number + start of the name), row labels on their own line; no sideways scrolling at 320 px, also with three 103-character names.

States: fewer than 2 cars: `EmptyState` (title "Dodaj co najmniej 2 auta", or "Dodaj jeszcze jedno auto" with 1 car) containing a `SearchCombobox` and a link button to the rankings; the switch and assumptions are hidden. Loading: `ComparisonSkeleton`.

### 6.5 Methodology (`/methodology`; preview `methodology`)

Grid from 1024 px: article + 16rem "On this page" navigation (sticky, top 1.5rem), gap 3rem; below 1024 px the navigation comes first, above the article. Article: h1, intro 18 px `ink-muted`, `Prose` sections (h2 each, with an `id` for the anchors; the section "Moc aut elektrycznych i hybryd", id `moc` / `power`, is the target of the power-label links), `DataTable` of data sources (source link, what is taken, update rhythm, licence) 3rem below, `Notice` with the disclaimers 2.5rem below. Heading order: h1, h2 per section.

### 6.6 Not found and error (preview `not-found`, `error`)

Left-aligned block, max width 36rem, padding 3rem 0 (5rem from 768 px).

- 404: h1, intro 18 px, `SearchCombobox`, primary link button "Zobacz rankingi" and secondary "Strona główna".
- Error: 24 px alert icon in `danger`, h1, intro, primary button "Spróbuj ponownie" (refresh icon) and secondary link "Strona główna".

## 7. Responsive rules

- Mobile first; the layout is fluid between breakpoints (section 3.5). Verified at 320, 375, 768 and 1280 px; no page scrolls sideways at any of them (`scrollWidth <= clientWidth` on all 25 preview pages, Polish and English, including the pages filled with 100-character names).
- `RankingItem` and `EarningsScale` respond to the width of their container, not of the viewport, so the same row works in a half-width column on the home page and in the full-width list.
- Car names: section 7.1.
- The only element allowed to scroll sideways is `DataTable`, inside its own focusable region.
- Fixed comparison bar: the footer reserves `--bar-space` (the bar's measured height) so nothing ends up under it, and the page's scroll padding keeps focused controls above it (section 8); it respects `env(safe-area-inset-bottom)`.
- Text can be zoomed to 200%: sizes are in rem, containers have no fixed heights (controls use `min-height`).

### 7.1 Long car names

Names come from the source unchanged: median 28 characters, 30% over 40, longest 103, some with "/"-joined parts and no spaces. One rule: **a name is printed in full and wraps**; it is cut only where a fixed strip must stay one line high, and there the whole name is one visible control away. Every name goes through `CarName` inside an element with `nameWrapClass`.

| Component | Rule | Where the whole name is read |
|---|---|---|
| Ranking item (`RankingItem`) | Full name, wraps. In the narrow layout the name has the whole row width (103 characters: 4 lines at 320 px); in the wide layout it wraps in the name column (2 to 3 lines). | In place |
| Home list item (`RankingItem` in a half-width list) | Same component, same rule. | In place |
| Search suggestion (`SearchCombobox`) | Full name, wraps; the price stays top right; the list scrolls inside 22rem. | In place |
| Comparison bar (`CompareBar`) | Closed bar from 1024 px: one line with an ellipsis. Below 1024 px the closed bar shows no names. Open list: full name, wraps. Attributes are never cut in either state. | Press the count button ("Wybrane: 2 z 3"): the open list prints every name in full, at every width |
| Comparison table header (`ComparisonTable`) | From 768 px: full name, wraps in its column (18 px, 22 px from 1024 px). Below 768 px: full name in the list of cars above the table; the sticky key header shows the car's number and at most 2 lines of the name. | In place; below 768 px in the numbered list of cars directly above the table (same number) |
| Car page heading (h1) | Full name, wraps (36 px, 48 px from 768 px). | In place |

No component relies on `title` or `aria-label` to give the whole name. Where a name is cut visually (closed bar, key header) the DOM text is still the whole name, so assistive technology reads it in full.

## 8. Accessibility notes

- **Focus style:** every focusable element shows `outline: 3px solid var(--focus-ring); outline-offset: 2px` on `:focus-visible` (global rule in `globals.css`). Ring colour: `brand` on light surfaces, `signal` inside `[data-surface="dark"]`. Fields draw the ring on their box (`.field-box:focus-within`); controls built on hidden native inputs draw it on the label; full-bleed items (ranking row, link-list cell, header navigation, checkbox row, data table region) draw it inside with offset -3 px. Never remove or restyle the ring.
- **Focus not obscured (WCAG 2.2 SC 2.4.11):** while the fixed comparison bar is on the page, `<html>` has `scroll-padding-bottom` = bar height + 1rem, so the browser scrolls a newly focused control clear of the bar. The bar's open list is opened by the user, closes on Escape and closes by itself when focus leaves the bar, so it never covers a focused control of the page. Measured by tabbing through every control of the 17 preview pages that show the bar, at 375 x 812, 375 x 568 and 1280 x 800: no focused element is fully covered.
- **Target sizes:** all pointer targets are at least 24 x 24 CSS px; the only smaller ones are links inside a sentence (WCAG 2.5.8 inline exception). The car-name link of the narrow comparison is a block at least 24 px high. Primary actions (md buttons, search, nav links, sheet close and apply, compare action) are at least 44 px high. On coarse pointers (`pointer-coarse:`) small buttons, compare toggles, chips, checkbox rows, language links, footer links and remove buttons grow to 44 px. Segmented switches are 44 px high as a whole (segments 36 px).
- **Reduced motion:** with `prefers-reduced-motion: reduce` every animation and transition is cut to 0.01 ms and one iteration (global rule): the strip appears at full length, sheets open without sliding, skeletons do not pulse, the loading spinner does not turn (`aria-busy` carries the state).
- **Landmarks:** `header`, `nav` (main navigation, language, footer navigation, metric selector, breadcrumb, "on this page"; each with its own `aria-label`), `main#main`, `aside` (filters, assumptions, comparison bar), `footer`. The skip link targets `#main`.
- **Heading order:** one h1 per page; h2 for page sections and sheet titles; h3 for car names in ranking rows and for empty-state titles inside a section. No level is skipped.
- **Not colour alone:** estimates have a sign and a spoken word; best values have a tick and a word; scale levels have a name and a meter; selected chips have a tick and a thicker border; the current navigation item has weight and an underline; invalid fields have an icon and a message; cost categories are named in the table next to their colour.
- **Forms:** every control has a visible label (or `aria-label` for search); hints and errors are linked with `aria-describedby`; errors say what to enter. Groups use `fieldset` / `legend`.
- **Live regions:** search result count, ranking car count and comparison-bar count are polite live regions; the comparison bar's hint line is a status region (it announces the limit message); inline errors use `role="alert"`; skeleton wrappers use `role="status"`.
- **Language:** `<html lang>` follows the locale; language links carry `lang` and `hrefLang`; the brand name has `translate="no"`.
- **Tables:** real `<table>` elements with captions, `scope` on headers; the comparison renders one of two tables per width, the other is `display: none`; below 768 px the cars are an ordered list before the table and the column headers repeat each car's number and whole name (cut only visually).

## 9. Microcopy

Source of truth for every string: `src/mocks/copy.ts` and `src/mocks/methodology.ts` (both languages, same keys). Rules: sentence case; plain verbs; second person; a control says what it does and keeps that name everywhere ("Porównaj" on the toggle, in the bar, in hints); errors say what happened and what to do, with no apology and no codes; no exclamation marks; Polish quotation marks „…”, English “…”; en dash for ranges (10–15%); ellipsis character in placeholders and loading texts. Polish plural forms: 1 auto, 2–4 auta, 5+ aut (and 12–14 aut).

### 9.1 Shared

| Key | Polish | English |
|---|---|---|
| Skip link | Przejdź do treści | Skip to content |
| Estimate, spoken | około | about |
| Indicative price | cena orientacyjna | indicative price |
| Period captions | miesięcznie / rocznie | per month / per year |
| Period switch (legend: Okres kosztów / Cost period) | Miesięcznie / Rocznie | Monthly / Yearly |
| Close / retry / home | Zamknij / Spróbuj ponownie / Strona główna | Close / Try again / Home |
| Methodology link | Jak liczymy | How we calculate |
| Header navigation | Rankingi / Porównanie / Jak liczymy | Rankings / Compare / How we calculate |
| Logo link, nav names | WheelWise, strona główna; Główna nawigacja; Język; Nawigacja w stopce | WheelWise, home; Main navigation; Language; Footer navigation |
| Badge, spoken | w porównaniu: {n} | in comparison: {n} |
| Footer, about | WheelWise pokazuje, ile kosztuje nowe auto po wyjechaniu z salonu: utrata wartości, paliwo, ubezpieczenie, serwis, części i opłaty. | WheelWise shows what a new car costs once it leaves the showroom: depreciation, fuel, insurance, servicing, parts and fees. |
| Footer, sources title | Źródła danych | Data sources |
| Footer, sources | ADEME Car Labelling: katalog aut, ceny, zużycie (Licence Ouverte 2.0); Komisja Europejska, Weekly Oil Bulletin: ceny paliw; Eurostat: cena prądu dla gospodarstw domowych; Narodowy Bank Polski: kurs euro | ADEME Car Labelling: car catalogue, prices, consumption (Licence Ouverte 2.0); European Commission, Weekly Oil Bulletin: fuel prices; Eurostat: household electricity price; Narodowy Bank Polski: euro exchange rate |
| Footer, disclaimer | Koszty są szacunkami, a ceny aut to ceny orientacyjne: francuskie ceny katalogowe przeliczone na złote. Serwis nie jest ofertą handlową ani poradą finansową. | Costs are estimates and car prices are indicative: French list prices converted to złoty. This site is neither a sales offer nor financial advice. |
| Data freshness | Dane sprawdzone {date}. Ceny paliw z {date}, cennik aut z {date}. | Data checked on {date}. Fuel prices from {date}, car price list from {date}. |
| Cost categories | Utrata wartości; Paliwo i energia; Ubezpieczenie; Serwis; Części i eksploatacja; Opłaty; Razem | Depreciation; Fuel and energy; Insurance; Servicing; Parts and wear; Fees; Total |
| Breakdown table | Kategoria / Kwota / Udział; caption: Koszty według kategorii, {okres} | Category / Amount / Share; caption: Costs by category, {period} |
| Body types | sedan / hatchback, kombi, SUV, coupé, kabriolet, minivan, van | saloon / hatchback, estate, SUV, coupé, convertible, MPV, van |
| Powertrains | benzyna, diesel, LPG, hybryda, hybryda plug-in, elektryczny | petrol, diesel, LPG, hybrid, plug-in hybrid, electric |
| Gearbox (attribute) | skrzynia manualna, automat | manual gearbox, automatic |
| Segments | A mini, B miejskie, C kompaktowe, D średnie, E wyższe, F luksusowe | A mini, B small, C compact, D mid-size, E executive, F luxury |
| Units | KM; l/100 km; kWh/100 km | hp; l/100 km; kWh/100 km |
| Periods after "po" (Polish locative) | po roku, po 2 latach … po 10 latach | after 1 year, after 2 years … |

### 9.2 Search

| Key | Polish | English |
|---|---|---|
| Label | Szukaj auta | Search for a car |
| Placeholder | Marka lub model, np. Clio… | Make or model, e.g. Clio… |
| Clear | Wyczyść | Clear |
| No results, title | Nie mamy takiego auta | We don’t have that car |
| No results, hint | Sprawdź pisownię albo wpisz samą markę. W katalogu są tylko auta nowe. | Check the spelling or type the make only. The catalogue lists new cars only. |
| Loading | Szukam… | Searching… |
| Status (live) | Brak wyników / {n} wynik, wyniki, wyników | No results / {n} result(s) |

### 9.3 Home

| Key | Polish | English |
|---|---|---|
| Title | Ile naprawdę kosztuje nowe auto? | What does a new car really cost? |
| Intro | Cena w salonie to dopiero początek. Sprawdź miesięczny koszt każdego nowego auta, porównaj modele i zobacz, przy jakich zarobkach auto mieści się w budżecie. | The showroom price is only the start. See the monthly cost of any new car, compare models and find out what income keeps a car within budget. |
| Top by price | Najtańsze w zakupie; Najtańsze nowe auta według ceny orientacyjnej.; Cały ranking cen | Cheapest to buy; The cheapest new cars by indicative price.; Full price ranking |
| Top by cost | Najniższy całkowity koszt; Miesięcznie, przy 15 000 km rocznie przez 5 lat.; Cały ranking kosztów | Lowest total cost; Per month, at 15,000 km a year over 5 years.; Full cost ranking |
| All rankings | Wszystkie rankingi | All rankings |
| Estimate note | ≈ oznacza szacunek. Ceny aut są orientacyjne. Jak liczymy | ≈ marks an estimate. Car prices are indicative. How we calculate |

Metric names and descriptions (home link list, metric selector):

| Metric | Polish | English |
|---|---|---|
| `price` | Cena zakupu. Najtańsze nowe auta według ceny orientacyjnej. | Purchase price. The cheapest new cars by indicative price. |
| `totalCost` | Całkowity koszt. Wszystkie koszty razem, z utratą wartości. | Total cost. Every cost added up, depreciation included. |
| `depreciation` | Utrata wartości. Które auta najwolniej tanieją. | Depreciation. Which cars lose value most slowly. |
| `maintenance` | Utrzymanie. Serwis, części i opłaty razem. | Maintenance. Servicing, parts and fees together. |
| `service` | Serwis. Przeglądy i obsługa okresowa. | Servicing. Inspections and scheduled service. |
| `parts` | Części i eksploatacja. Opony, hamulce i inne części zużywalne. | Parts and wear. Tyres, brakes and other wear parts. |
| `fuelConsumption` | Zużycie paliwa. Litry na 100 km według WLTP. | Fuel consumption. Litres per 100 km, WLTP figures. |
| `fuelCost` | Koszt paliwa. Paliwo lub prąd przy Twoim przebiegu. | Fuel cost. Fuel or electricity at your mileage. |
| `insurance` | Ubezpieczenie. OC albo OC z AC dla Twojego wieku. | Insurance. Third-party or comprehensive, for your age. |

### 9.4 Rankings, filters, assumptions

| Key | Polish | English |
|---|---|---|
| Title | Rankingi nowych aut | New car rankings |
| Metric label | Ranking według | Rank by |
| List title | {metryka}, {okres} (Całkowity koszt, miesięcznie) | {metric}, {period} (Total cost, per month) |
| Car count | {n} auto / auta / aut | {n} car / cars |
| Showing | Pokazano {n} z {m} | Showing {n} of {m} |
| Consumption caption | WLTP | WLTP |
| Consumption note, default | Ten ranking pokazuje litry na 100 km dla aut spalinowych i hybryd. Nie ma w nim hybryd plug-in, bo ich zużycie zależy od tego, jak często je ładujesz. Auta elektryczne zobaczysz w kWh na 100 km, gdy w filtrze „Napęd” zostawisz tylko „elektryczny”. | This ranking shows litres per 100 km for combustion and hybrid cars. Plug-in hybrids are left out, because their consumption depends on how often you charge them. Electric cars appear in kWh per 100 km when “electric” is the only powertrain selected in the filters. |
| Consumption note, only "electric" selected | Ten ranking pokazuje zużycie prądu aut elektrycznych w kWh na 100 km. Aby wrócić do litrów na 100 km, zmień filtr „Napęd”. | This ranking shows the electricity use of electric cars in kWh per 100 km. To go back to litres per 100 km, change the “Powertrain” filter. |
| Show more | Pokaż kolejne 10 | Show 10 more |
| Estimate note | ≈ oznacza szacunek dla Twoich założeń. Jak liczymy | ≈ marks an estimate for your assumptions. How we calculate |
| Empty | Żadne auto nie pasuje do tych filtrów. Poszerz zakres cen albo wyłącz część filtrów. W katalogu są tylko auta nowe. | No car matches these filters. Widen the price range or switch some filters off. The catalogue lists new cars only. |
| Error | Nie udało się wczytać rankingu. Sprawdź połączenie z internetem i spróbuj ponownie. Filtry i założenia zostały zachowane. | The ranking could not be loaded. Check your internet connection and try again. Your filters and assumptions are kept. |
| Loading | Wczytuję ranking… | Loading the ranking… |
| Filters: title, apply | Filtry; Pokaż {n} auto / auta / aut | Filters; Show {n} car / cars |
| Filters: query | Marka lub model; np. Clio… | Make or model; e.g. Clio… |
| Filters: price | Cena orientacyjna; Od; Do; zł | Indicative price; From; To; zł |
| Filters: price error | Cena „od” jest wyższa niż „do”. Zamień je albo popraw jedną z nich. | “From” is higher than “To”. Swap them or correct one of them. |
| Filters: groups | Nadwozie; Napęd; Skrzynia biegów (Dowolna / Manualna / Automat); Segment; Marka | Body type; Powertrain; Gearbox (Any / Manual / Automatic); Segment; Make |
| Active filters | Włączone filtry; Usuń filtr: {nazwa}; Wyczyść filtry | Active filters; Remove filter: {name}; Clear filters |
| Assumptions: title, actions | Założenia; Zmień; Gotowe | Assumptions; Change; Done |
| Assumptions: summary | {km} km rocznie, {n lat}, OC + AC, kierowca 35–44 lata | {km} km a year, {n years}, OC + AC, driver aged 35–44 |
| Mileage | Roczny przebieg; km; Od 1 000 do 100 000 km. | Yearly mileage; km; From 1,000 to 100,000 km. |
| Mileage error | Wpisz przebieg od 1 000 do 100 000 km, samymi cyframi. | Enter a mileage from 1,000 to 100,000 km, digits only. |
| Ownership | Jak długo zatrzymasz auto; 1 rok, 2 lata, 3 lata, 4 lata, 5 lat … 10 lat | How long you will keep the car; 1 year, 2 years … 10 years |
| Insurance mode | Ubezpieczenie; Oszacuj za mnie; Znam swoją składkę | Insurance; Estimate it for me; I know my premium |
| Driver age | Wiek kierowcy; 18–24 lata, 25–34 lata, 35–44 lata, 45–54 lata, 55–59 lat, 60–64 lata, 65–69 lat, 70–74 lata, 75 lat i więcej | Driver’s age; 18–24 years … 70–74 years, 75 years and over |
| Coverage | Zakres ochrony; Samo OC; OC + AC | Cover; OC only; OC + AC |
| Own premium | Roczna składka; zł; Kwota z Twojej polisy lub oferty, za cały rok. | Yearly premium; zł; The amount from your policy or quote, for a full year. |
| Premium error | Wpisz składkę od 0 do 100 000 zł, samymi cyframi. | Enter a premium from 0 to 100,000 zł, digits only. |
| Compare toggle | Porównaj; W porównaniu | Compare; In comparison |
| Reason a toggle is disabled (under a lone toggle), and the message after a fourth car is tried (in the bar) | Porównanie mieści 3 auta. Usuń jedno, aby dodać kolejne. | A comparison holds 3 cars. Remove one to add another. |
| Compare bar: disclosure button | Wybrane: {n} z 3 | Selected: {n} of 3 |
| Compare bar: announced count; list name | Wybrano {n} z 3 aut; Wybrane auta | {n} of 3 cars selected; Selected cars |
| Compare bar: action | Porównaj {n} auta; idle: Porównaj | Compare {n} cars; idle: Compare |
| Compare bar: hints | 0: Dodaj 2 lub 3 auta przyciskiem „Porównaj”. 1: Dodaj jeszcze jedno auto, aby porównać. 3: Komplet. Usuń auto, aby dodać inne. | 0: Add 2 or 3 cars with the “Compare” button. 1: Add one more car to compare. 3: Full. Remove a car to add another. |
| Compare bar: other | Porównanie (region); Usuń z porównania: {auto}; Wyczyść | Comparison; Remove from comparison: {car}; Clear |

### 9.5 Car details

| Key | Polish | English |
|---|---|---|
| Breadcrumb name | Okruszki | Breadcrumb |
| Price | Cena orientacyjna | Indicative price |
| Price explanation | Francuska cena katalogowa najtańszej wersji, przeliczona na złote z polskim VAT. W polskim salonie cena może być inna. | French list price of the cheapest version, converted to złoty with Polish VAT. The price at a Polish dealer may differ. |
| Price date, source | Cennik z {data}, źródło: ADEME Car Labelling | Price list of {date}, source: ADEME Car Labelling |
| Several-versions notice | Nazwa i cena należą do najtańszej wersji tego auta. Wersje, które różnią się tylko napędem (2WD / 4WD), baterią, liczbą miejsc lub długością nadwozia, liczymy jako jedno auto; kosztują więcej. | The name and price belong to the cheapest version of this car. Versions that differ only in drive (2WD / 4WD), battery, number of seats or body length count as one car here; they cost more. |
| Attributes | Dane auta: Nadwozie, Segment, Napęd, Skrzynia biegów, power label (section 9.9), Pojemność silnika, Zużycie (WLTP) | Car details: Body type, Segment, Powertrain, Gearbox, power label (section 9.9), Engine size, Consumption (WLTP) |
| Cost section | Koszt posiadania; {okres}, licząc {n lat} posiadania | Cost of ownership; {period}, over {n years} of ownership |
| Residual value | Po {n latach} auto będzie warte ≈ {kwota} ({p}% ceny). | After {n years} the car will be worth ≈ {amount} ({p}% of the price). |
| Cost per km | Każdy kilometr kosztuje ≈ {kwota}. | Every kilometre costs ≈ {amount}. |
| Estimate note | ≈ oznacza szacunek dla Twoich założeń, nie ofertę. Jak liczymy | ≈ marks an estimate for your assumptions, not an offer. How we calculate |
| Earnings: title | Jakie zarobki na to auto | The income this car calls for |
| Earnings: intro | Miesięczny dochód netto (na rękę), przy którym koszt ≈ {kwota} miesięcznie zajmuje daną część budżetu. | Net monthly income (take-home pay) at which a cost of ≈ {amount} per month takes the given share of the budget. |
| Level 1 | komfortowo; auto zajmuje do 10% dochodu | comfortable; the car takes up to 10% of income |
| Level 2 | rozsądnie; auto zajmuje 10–15% dochodu | reasonable; the car takes 10–15% of income |
| Level 3 | na granicy; auto zajmuje 15–20% dochodu | stretching it; the car takes 15–20% of income |
| Level 4 | niezalecane; auto zajmuje ponad 20% dochodu | not recommended; the car takes over 20% of income |
| Ranges | od {min}; od {min} do {max}; do {max} | from {min}; from {min} to {max}; up to {max} |
| Loading | Wczytuję dane auta… | Loading the car… |

### 9.6 Comparison

| Key | Polish | English |
|---|---|---|
| Title | Porównanie aut | Car comparison |
| Table caption, row header | Porównanie kosztów, {okres}; Pozycja | Cost comparison, {period}; Item |
| Rows | Cena orientacyjna; (six cost categories); Razem; Wartość po {n latach}; Zużycie (WLTP); Moc | Indicative price; (six cost categories); Total; Value after {n years}; Consumption (WLTP); Power |
| List of cars (name, below 768 px) | Porównywane auta | Cars compared |
| Best marks | najniżej; najwyżej | lowest; highest |
| Remove | Usuń (name: Usuń z porównania: {auto}) | Remove (name: Remove from comparison: {car}) |
| Add third | Dodaj trzecie auto | Add a third car |
| Empty, 0 cars | Dodaj co najmniej 2 auta | Add at least 2 cars |
| Empty, 1 car | Dodaj jeszcze jedno auto | Add one more car |
| Empty text | Porównanie mieści 2 lub 3 auta. Wyszukaj je tutaj albo dodaj przyciskiem „Porównaj” w rankingu. | A comparison holds 2 or 3 cars. Search for them here or add them with the “Compare” button in a ranking. |
| Empty action | Przejdź do rankingów | Go to rankings |
| Loading | Wczytuję porównanie… | Loading the comparison… |

### 9.7 Methodology

Full text: `src/mocks/methodology.ts` (a design proposal; every figure must be checked against `src/config/cost-model.ts` before release).

| Key | Polish | English |
|---|---|---|
| Title | Jak liczymy | How we calculate |
| Intro | WheelWise nie zgaduje. Każda kwota na stronie powstaje z publicznych danych i jawnego modelu kosztów. Tu opisujemy, skąd bierzemy liczby i gdzie kończy się ich dokładność. | WheelWise does not guess. Every amount on the site comes from public data and an open cost model. This page says where the numbers come from and where their precision ends. |
| Contents label | Na tej stronie | On this page |
| Section headings | Ceny aut są orientacyjne; Z czego składa się koszt; Co oznacza znak ≈; Moc aut elektrycznych i hybryd; Skala zarobków; Jak często odświeżamy dane | Car prices are indicative; What the cost is made of; What the ≈ sign means; Power of electric and hybrid cars; The income scale; How often the data is refreshed |
| Sources table | Źródła danych; columns: Źródło, Co z niego bierzemy, Aktualizacja, Licencja | Data sources; columns: Source, What we take from it, Updated, Licence |
| Disclaimer title | Zanim podejmiesz decyzję | Before you decide |

### 9.8 Not found and error

| Key | Polish | English |
|---|---|---|
| 404 title | Nie ma takiej strony | This page does not exist |
| 404 text | Adres może być błędny albo auto zniknęło z katalogu po aktualizacji danych. Wyszukaj je ponownie lub zacznij od rankingów. | The address may be wrong, or the car left the catalogue after a data update. Search for it again or start from the rankings. |
| 404 actions | Zobacz rankingi; Strona główna | See the rankings; Home |
| Error title | Coś się zepsuło po naszej stronie | Something broke on our side |
| Error text | Nie udało się wczytać tej strony. Spróbuj ponownie za chwilę. Twoje założenia i wybrane auta są zapisane w tej przeglądarce. | This page could not be loaded. Try again in a moment. Your assumptions and selected cars are saved in this browser. |
| Error actions | Spróbuj ponownie; Strona główna | Try again; Home |

### 9.9 Power labels

The source gives a different kind of power per powertrain, and the label says which. The case follows `fuelType`; no data field is added. Keys: `power.plain`, `power.engine`, `power.source` in `src/mocks/copy.ts`.

| Case | Full label (term on the car page) | Short form (lists, search, bar, comparison header) | Under the value in the comparison row "Moc" / "Power" | Explanation under the value on the car page |
|---|---|---|---|---|
| `petrol`, `diesel`, `lpg` | Moc / Power | 91 KM / 91 hp | (nothing) | (nothing) |
| `hybrid`, `phev` | Moc silnika spalinowego / Combustion engine power | silnik spalinowy 131 KM / engine 131 hp | silnik spalinowy / combustion engine | Źródło podaje tylko silnik spalinowy, bez mocy całego układu hybrydowego. / The source gives the combustion engine only, not the power of the whole hybrid system. |
| `ev` | Moc według danych źródłowych / Power per source data | 120 KM wg źródła / 120 hp per source | według danych źródłowych / per source data | Zwykle moc znamionowa, niższa od szczytowej, którą podaje producent. / Usually rated power, lower than the peak power the manufacturer quotes. |

- **Full form** = full label + value `88 kW (120 KM)`. Car page: the label is the `<dt>`, the value is `PowerDetail` with the explanation and the link. Comparison table: row "Moc" with the value and the kind of power under it (`ComparisonRow.notes`).
- **Short form** = `PowerLabel` at the end of `CarMeta`. Sighted users read the short text; its accessible text is the full text, exactly `{full label}: {value}`, for example "Moc według danych źródłowych: 88 kW (120 KM)" (the short text is `aria-hidden`, the full text is visually hidden).
- **Link to the methodology** (explanation on the car page of hybrids and electric cars, note under the comparison): "Skąd bierzemy moc" / "Where power figures come from", to `/methodology#moc` (`#power` in English).
- **Note under the comparison** (when a compared car is not plain): "Moc aut elektrycznych podajemy według danych źródłowych (zwykle moc znamionowa), a moc hybryd to moc samego silnika spalinowego." / "Power of electric cars is given per source data (usually rated power); for hybrids it is the power of the combustion engine alone."

## 10. Number and currency formatting

Functions in `src/components/ui/format.ts` (`Intl` with `pl-PL` and `en-GB`).

| What | Polish | English | Function |
|---|---|---|---|
| Amount in PLN, no grosze | `1 234 zł` | `1,234 zł` | `formatPln` |
| Small amount (cost per km) | `1,05 zł` | `1.05 zł` | `formatPlnExact` |
| Whole number | `15 000` | `15,000` | `formatInteger` |
| One decimal (consumption) | `5,3 l/100 km` | `5.3 l/100 km` | `formatDecimal` |
| Share | `40%` | `40%` | `formatPercent` |
| Date | `14 września 2026` | `14 September 2026` | `formatDate` |

- **Chosen rule for English: `1,234 zł`** (number, non-breaking space, "zł" in both languages), so an amount looks the same after a language switch and the currency sign is the one printed on Polish price lists.
- The thousands separator is always shown, also for four-digit numbers (`useGrouping: "always"`); the space between number and unit never breaks.
- Estimated amounts are prefixed with "≈" through `<Estimate>`; indicative list prices, WLTP consumption and user inputs are not.
- Power, full value: `67 kW (91 KM)` / `67 kW (91 hp)`; in lists the horsepower figure alone with the label of section 9.9. Engine size: `999 cm³`. Plug-in hybrid consumption: `0,9 l + 15,4 kWh /100 km`. Missing value: en dash "–".
- Values in input fields are plain digits without separators (`15000`).

## 11. Interaction and motion

- Colour transitions on hover, focus, press and selection: `--duration-fast`. Hover styles apply only on devices that hover (`@media (hover: hover)`, custom `hover` variant in `globals.css`).
- One authored moment: on the car page the large cost strip grows from the left once (`--animate-strip-grow`). Nothing else animates on load; there are no scroll-triggered effects.
- Sheets slide in from the bottom (below 768 px) or from the right (`--duration-slow`, `--ease-out-expo`) with a fading backdrop, and slide out the same way (`@starting-style` and `transition-behavior: allow-discrete`, no JavaScript).
- Loading: skeletons that keep the final layout's sizes, so nothing shifts when data arrives; buttons show a spinner and `aria-busy`.
- Changing an assumption, filter, metric or period updates results in place; the count lines announce the change.
- Adding a car to the comparison: the toggle changes to "W porównaniu", the bar appears or updates its count. With three cars the remaining toggles show the disabled look and the bar's hint line reads "Komplet. Usuń auto, aby dodać inne."
- Trying to add a fourth car (activating a disabled toggle): nothing is added; the bar's hint line changes to the limit message "Porównanie mieści 3 auta. Usuń jedno, aby dodać kolejne." with an amber alert icon and is announced. It stays until the selection changes or the page is left; no timer.
- Comparison bar: pressing the count opens the list of selected cars above the bar (no animation, chevron turns in `--duration-fast`); Escape, a second press, or focus leaving the bar closes it. Each car has a remove button; "Wyczyść" empties the selection.
- Removing a car or clearing the comparison is immediate and needs no confirmation: it is undone with one click on the toggle.
- Search: the list opens on focus when the field has text; see `SearchCombobox` in section 5.2 for keys.

## 12. Implementation notes

- Use the components as they are; pass translated, formatted strings. Do not restyle: token values, the focus ring, the order and colours of cost categories (`COST_ORDER`, `COST_FILL`), the "≈" marker, the wording "cena orientacyjna" and "niezalecane", control heights.
- Colours, sizes, radii and shadows come only from the tokens in `globals.css`; no hex values in components. `src/app/icon.svg` repeats three token values as literals because an SVG file cannot read CSS variables: `#0e4553` (brand-strong), `#ffffff`, `#ffb81c` (signal).
- Fonts: put `fontVariables` from `src/components/ui/fonts.ts` on `<html>` (done in `src/app/[locale]/layout.tsx`).
- Mock data: `src/mocks/cars.ts` (cars, costs, income ranges, counts), `src/mocks/copy.ts` and `src/mocks/methodology.ts` (texts), `src/mocks/types.ts` (local copies of the domain types; replace with imports from `@/lib/domain/types` and `@/lib/costs`, the shapes and units are the same). The mock cars are real catalogue rows with real slugs; two rows are invented for the long-name comparison and are marked `mockStressSlugs`. Move the texts to `messages/pl.json` and `messages/en.json`; the functions in `copy.ts` become ICU plurals and placeholders.
- `src/app/[locale]/design-preview/_lib/view.ts` shows how domain objects map to component props (formatting and picking only): reuse the mapping, replace the mock imports with real data. `powerKind(car)` picks the power label from `fuelType`; `carMeta(car, locale)` builds the attribute line that must accompany every name.
- `CostBreakdown.residualValuePct` is a percentage from 0 to 100, in the mocks as in the cost engine. `formatPercent` takes a share from 0 to 1, so the car page calls `formatPercent(costs.residualValuePct / 100, locale)`; cost shares are already fractions and are passed as they are.
- Car names: always `<CarName>` inside an element with `nameWrapClass`; never `truncate` a name outside the closed comparison bar and the key header of the narrow comparison.
- Compare toggles in lists get `describedBy={COMPARE_BAR_HINT_ID}`; a lone toggle gets `showHint`. On an attempt to add a fourth car set `notice` on `CompareBar` and keep it until the selection changes.
- Fuel-consumption ranking: render the default `InfoNote`, or the electric variant when "electric" is the only selected powertrain; hide the month / year switch for `price` and `fuelConsumption`.
- Components with state are client components (`SearchCombobox`, `Sheet`, `SheetDisclosure`); the rest work in Server Components when used uncontrolled. Controlled use needs the handlers listed in section 5.
- `SearchCombobox`: supply `options` for the current `query` (at most 8 are shown) and `statusText` for the live region.
- `CompareBar` is a client component: render it through `SiteShell`'s `compareBar` slot only when at least one car is selected, so the footer reserves room for it. Do not set `--bar-height` yourself and do not remove `data-compare-bar`: the focus rule in `globals.css` depends on them.
- Every design-preview page calls `assertDesignPreview()` and returns 404 unless `NEXT_PUBLIC_DESIGN_PREVIEW === "1"` at build time.
- Dependencies added by the design: none.

## 13. Screenshots (`design/screens/`)

File name: `<screen>-<width>-<locale>.png`. Captured from a production build with Playwright (Chromium, headless), device scale factor 1, so every file is exactly 375 or 1280 px wide; reduced motion on. Viewport 375 x 812 and 1280 x 900.

- **Full-page captures** (whole document height): every file not listed as a viewport capture. The viewport is grown to the height of the document before the capture, so the fixed comparison bar sits at the bottom edge of the image, over the room the footer keeps free for it, as it does on a real screen scrolled to the end.
- **Viewport captures** (exactly 375 x 812 or 1280 x 900), used where a layer covers the page: `rankings-filters-open-*`, `rankings-assumptions-open-*`, `rankings-full-*`, `compare-bar-open-*`.

| Screen | Files |
|---|---|
| Home | `home-375-pl`, `home-1280-pl`, `home-375-en`, `home-1280-en` |
| Home, long names | `home-long-names-375-pl`, `home-long-names-1280-pl` |
| Rankings | `rankings-375-pl`, `rankings-1280-pl`, `rankings-375-en` |
| Rankings, filters sheet (viewport) | `rankings-filters-open-375-pl` |
| Rankings, assumptions sheet / drawer (viewport) | `rankings-assumptions-open-375-pl`, `rankings-assumptions-open-1280-pl` |
| Rankings, empty / error / loading | `rankings-empty-375-pl`, `rankings-error-375-pl`, `rankings-loading-375-pl`, `rankings-loading-1280-pl` |
| Rankings, fuel consumption with its note | `rankings-consumption-375-pl`, `rankings-consumption-1280-pl` |
| Rankings, comparison full with the limit message (viewport) | `rankings-full-375-pl`, `rankings-full-1280-pl` |
| Rankings, long names | `rankings-long-names-375-pl`, `rankings-long-names-1280-pl` |
| Car details, petrol | `car-375-pl`, `car-1280-pl`, `car-375-en` |
| Car details, electric | `car-electric-375-pl`, `car-electric-1280-pl` |
| Car details, hybrid, 103-character name, comparison full | `car-long-name-375-pl`, `car-long-name-1280-pl` |
| Comparison, 3 cars | `compare-375-pl`, `compare-1280-pl`, `compare-375-en` |
| Comparison, 3 cars with the 103-character name | `compare-long-names-375-pl`, `compare-long-names-1280-pl` |
| Comparison, 2 cars sharing a name | `compare-2-cars-375-pl`, `compare-2-cars-1280-pl` |
| Comparison bar with its list open (viewport) | `compare-bar-open-375-pl`, `compare-bar-open-1280-pl` |
| Comparison, empty (0 cars, 1 car) | `compare-empty-375-pl`, `compare-empty-1280-pl`, `compare-1-car-375-pl` |
| Comparison, loading | `compare-loading-375-pl`, `compare-loading-1280-pl` |
| Methodology | `methodology-375-pl`, `methodology-1280-pl` |
| Not found | `not-found-375-pl`, `not-found-1280-pl` |
| Error | `error-375-pl`, `error-1280-pl` |
| Components and states | `components-375-pl`, `components-1280-pl` |
