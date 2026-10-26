# WheelWise design specification

Implemented in `src/app/globals.css` (tokens), `src/components/ui/**`, `src/components/layout/SiteShell.tsx`.
Static previews: `src/app/[locale]/design-preview/**` (run with `NEXT_PUBLIC_DESIGN_PREVIEW=1`). Sample data and texts: `src/mocks/**`.
All class names below are Tailwind CSS 4 utilities generated from the tokens in section 3.

## 1. Design rationale

**Concept: a cost ledger, not a car showroom.** Every car is drawn as one horizontal *cost strip* split into six cost categories that always keep the same order and colour; around it the interface is typographic and numeric, with no decoration. The one photograph is the illustrative model photo on the car page: a reference plate that confirms which car this is, printed with its author, licence and source like every other figure on the site, never a showroom picture.

- **Speed, simplicity (szybkość, prostota):** the answer (a monthly amount) is the largest thing on every row and page; one search field on the home page; rankings are plain lists, not card grids; the mobile metric selector is a native select.
- **Minimalism:** two colours do the work (petrol for structure and actions, amber only for the one call to action on dark surfaces and the current navigation item; green only for value marks); cost colours appear only inside the strip and its legend. The logo's blue, green and orange bars are the one deliberately vivid spot, chosen by the user, and never reused elsewhere.
- **Accessibility, trust (dostępność, zaufanie):** every estimate carries the same quiet "≈" sign, every list price carries the words "cena orientacyjna" and its date; the best value in a comparison is marked with a tick and a word; all text pairs exceed 4.5:1.

Audience: ordinary people checking whether they can afford a new car, on phones and computers equally. Tone of the texts: plain, calm, second person, no sales language.

What a user should remember: the coloured strip that shows where the money goes.

Avoid: car photographs anywhere except that one model photo (no galleries, hero images or photos in lists), photos without their source, manufacturer logos, card grids with icons, gradients, glow, glass effects, shadows on static content, colour as the only carrier of meaning, all-caps labels, eyebrow labels above headings.

Typeface rationale: Barlow was drawn from Californian road signs and licence plates, so it belongs to the subject; its semi-condensed cut keeps long car names (cleaned catalogue names reach 95 characters, such as "Jeep Compass 1.5 Turbo T4 BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S"; layouts are checked with 103) and amounts compact.

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
| `--color-signal` | `#ffb81c` | Amber: the "Compare" action in the comparison bar, current-page underline, count badge, focus ring on dark surfaces, skip link |
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
| `--color-logo-blue` | `#4d9cff` | Logo bar 1 (tallest) on petrol surfaces (header, footer) and in the site icons. Nothing else |
| `--color-logo-green` | `#33d17a` | Logo bar 2 (middle), same surfaces. Nothing else |
| `--color-logo-orange` | `#ff7a1a` | Logo bar 3 (shortest), same surfaces. Nothing else |
| `--color-logo-blue-dark` | `#1f6feb` | Logo bar 1 on light surfaces (`Logo tone="brand"`). Nothing else |
| `--color-logo-green-dark` | `#15913f` | Logo bar 2 on light surfaces. Nothing else |
| `--color-logo-orange-dark` | `#db5f0d` | Logo bar 3 on light surfaces. Nothing else |

The six logo tokens (T41, the user's final choice: blue, green, orange, all vivid) live in their own `@theme static` block in `globals.css`, so the variables are always written to the built CSS even though no utility class uses them; `Logo` reads them through inline `fill: var(--color-logo-…, currentColor)` (section 5.3). OKLCH chroma 0.15 to 0.20 for all six (petrol `brand-strong` is 0.06), hues about 255 (blue), 150 (green), 48 (orange); the blue is kept at hue 255, well away from petrol (219), and much lighter and more saturated than it, so it never merges with the header. The bright trio sits at OKLCH lightness 69 / 76 / 72, so no bar dominates. They are not cost colours: `logo-green-dark` and `logo-orange-dark` resemble `cost-service` / `cost-fuel` only in hue, and the logo never appears inside or next to a cost strip.

Variables in `@layer base` (`:root`): `--focus-ring: var(--color-brand)` (set to `var(--color-signal)` inside `[data-surface="dark"]`); `--bar-space: 0rem` (bottom padding of the footer; with a comparison bar `SiteShell` sets it to `var(--bar-height, 6.5rem)`). `--bar-height` is not a token and has one writer, the fixed `CompareBar`. While that bar is shown (1 to 3 cars) it sets `--bar-height` inline on `<html>` to the height the bar has when it is closed with its present content (number of cars, hint, language, width), in px. The value is the same whether the bar is closed or open, so opening or closing the bar never changes the room under the footer and never moves the page. The bar writes it before the browser paints the frame in which the bar appears, also when it appears with its list already open, and again whenever the closed height changes (a car added or removed, also inside the open list; the hint or the limit message changing; a resize; a font arriving). When no car is left, or the bar leaves the page, the bar removes the inline property. A page that keeps the bar mounted with no car selected sets the resting value `--bar-height: 0px` on `<html>` by a class (the root layout does), so the footer keeps no room then; the inline value from the bar wins while it is present. `html:has([data-compare-bar="fixed"])` uses the property as `scroll-padding-bottom: calc(var(--bar-height, 6.5rem) + 1rem)`. A browser without `:has()` reads the same room from the property alone: `@supports not selector(:has(*)) { html { scroll-padding-bottom: calc(var(--bar-height, 0px) + 1rem) } }` (section 8, older browsers).

### 3.2 Typography

Families (self-hosted WOFF2 in `src/components/ui/fonts/`, loaded with `next/font/local` in `src/components/ui/fonts.ts`, `display: swap`; licence SIL OFL 1.1, `fonts/OFL.txt`; files are subset to Basic Latin, Latin-1 and Latin Extended-A/B, which covers Polish):

| Token | Value | Use |
|---|---|---|
| `--font-sans` | `var(--font-barlow), ui-sans-serif, system-ui, sans-serif` | Body, labels, controls. Barlow 400, 500, 600 |
| `--font-display` | `var(--font-barlow-semi-condensed), var(--font-barlow), ui-sans-serif, system-ui, sans-serif` | Headings, car names, all amounts. Barlow Semi Condensed 600 only (the logo is an outline, section 5.3) |

Weights: `--font-weight-normal: 400` (text), `--font-weight-medium: 500` (labels, chips, navigation), `--font-weight-semibold: 600` (headings, amounts, buttons, selected states). No other weight and no italics are loaded.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.8125rem (13 px) | 1.125rem | Captions, hints, notes, markers |
| `--text-sm` | 0.875rem (14 px) | 1.25rem | Meta lines, field labels, chips, small buttons, footer |
| `--text-base` | 1rem (16 px) | 1.5rem (1.625rem in `Prose`) | Body, fields, buttons, table labels |
| `--text-lg` | 1.125rem (18 px) | 1.625rem | Intro paragraphs, car name in a row (line height 1.5rem), category amounts |
| `--text-xl` | 1.375rem (22 px) | 1.75rem | h3, ranked value (line height 1.5rem), sheet title |
| `--text-2xl` | 1.75rem (28 px) | 2rem | h2, total in the comparison |
| `--text-3xl` | 2.25rem (36 px) | 2.5rem | h1 below 768 px, list price on the car page |
| `--text-4xl` | 3rem (48 px) | 3.125rem | h1 from 768 px, total cost on the car page |

Letter spacing: h1 `-0.01em`, h2 `-0.005em`, everything else `0`. Headings use `text-wrap: balance`. Every amount, rank and count uses `tabular-nums`. Shared heading classes: `h1Class`, `h2Class`, `h3Class`, `fieldLabelClass`, `linkClass`, `panelClass` in `src/components/ui/styles.ts`.

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
| (utility) `max-w-prose` | 65ch | Text measure: `Prose`, `InfoNote`, empty-state text, methodology intro, the sentence above the earnings scale. It follows the font size: 514 px at 14 px, 588 px at 16 px, 661 px at 18 px |
| (utilities) `max-w-md` / `max-w-xl` / `max-w-2xl` | 28rem / 36rem / 42rem | 28rem: the narrow text column of the car page (price explanation, several-versions notice, hint of a lone compare toggle) and the search field of the comparison. 36rem: 404 and error block. 42rem: home hero, inline error of the comparison page |
| `--container-prose` | 42rem | Declared in `@theme`, read by no utility (`max-w-prose` is the 65ch above) |
| `--container-lg` / `--container-3xl` / `--container-4xl` | 32rem / 48rem / 56rem | Container-query steps (`@lg`, `@3xl`, `@4xl`) |

Borders are 1 px. Static content has no shadow: panels are `border border-line bg-surface rounded-lg` (`panelClass`). Only layers above the page cast a shadow.

z-index (plain utilities, no theme variables): `10` comparison toggle above the row link, sticky comparison header; `30` comparison bar; `40` search popover; `50` skip link. Sheets use the browser top layer (`<dialog>`).

### 3.5 Breakpoints

| Token | Value | What changes |
|---|---|---|
| `--breakpoint-sm` | 40rem (640 px) | Link list 2 columns; car attributes 3 columns; comparison bar action (active and idle) gains its icon and its full side padding |
| `--breakpoint-md` | 48rem (768 px) | Header on one line; metric selector becomes links; comparison becomes a classic table; sheet becomes a right drawer; h1 48 px |
| `--breakpoint-lg` | 64rem (1024 px) | Filters sidebar; assumptions aside on the car page; car photo moves to the top of the right column; home lists side by side; link list 3 columns; the closed comparison bar shows the selected cars in one row |
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

Order switch and clear-filters button (T46), no new pair: segment text `ink` on `surface` 16.93, hovered `ink` on `brand-soft` 15.13, selected `on-brand` on `brand` 8.01; clear button `brand` on `surface` 8.01, hover `brand-strong` on `surface` 10.53, pressed `brand-deep` on `surface` 14.23, disabled `ink-muted` on `surface` 7.25 (exempt, still passes). Non-text: switch border `line-strong` on `ground` 3.44, selected segment fill `brand` against the `surface` track 8.01, focus ring `brand` on `ground` / `surface` 7.25 / 8.01. axe (wcag2a, wcag2aa, wcag21aa, wcag22aa): 0 violations on `rankings-no-filters` and `rankings-desc` at 1280 px, `rankings-filters-open` and `rankings-filters-open-none` at 320 px, `components` at 1280 px.

Car photo (section 5.3, `CarPhoto`), no new pair: caption `ink-muted` on `ground` 6.56; caption links `brand` on `ground` 7.25 (focus ring `brand` on `ground` 7.25); the tag on the photo is `ink` on an opaque `sunken` box 14.19, so its contrast does not depend on the photo behind it. The frame border is `line` (decorative: the photo edge needs no boundary).

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
| on-brand (logo ring and wordmark) | brand-strong / brand-deep | 10.53 / 14.23 | `Logo` in the header / footer |
| logo-blue (logo bar 1) | brand-strong / brand-deep | 3.77 / 5.09 | `Logo` in the header / footer |
| logo-green (logo bar 2) | brand-strong / brand-deep | 5.28 / 7.14 | `Logo` in the header / footer |
| logo-orange (logo bar 3) | brand-strong / brand-deep | 4.04 / 5.45 | `Logo` in the header / footer |
| brand-strong (logo ring and wordmark, `tone="brand"`) | surface / ground | 10.53 / 9.52 | `Logo` on light surfaces (not used on a page yet) |
| logo-blue-dark (logo bar 1, `tone="brand"`) | surface / ground | 4.63 / 4.19 | The same |
| logo-green-dark (logo bar 2, `tone="brand"`) | surface / ground | 4.07 / 3.69 | The same |
| logo-orange-dark (logo bar 3, `tone="brand"`) | surface / ground | 3.71 / 3.36 | The same |
| `#ffffff` ring, `#4d9cff` bar 1, `#33d17a` bar 2, `#ff7a1a` bar 3 | `#0e4553` tile | 10.53 / 3.77 / 5.28 / 4.04 | `icon.svg`, `apple-icon.png` |
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
| `SiteShell` | `skipLabel`, `header`, `footer`, `compareBar?`, `children` | Column `min-h-dvh`: skip link, header, `<main id="main" tabIndex={-1}>`, footer, comparison bar. With `compareBar` it reserves `--bar-space` (the height of the closed bar, section 3.1) under the footer. |
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
| `SegmentedSwitch` (`Choice.tsx`) | `name`, `legend`, `hideLegend? = true`, `options: { value, label, demo? }[]`, `value?` / `defaultValue?`, `onChange?(value)`, `fullWidth?: boolean \| "narrow"` | `fullWidth="narrow"` (T46): equal columns over the whole row below 640 px (segment padding 0 0.5rem), own width from 640 px (padding 0 0.875rem); used by the period and order switches of the rankings page. `options[].demo` (preview only) shows hover or focus on one segment. Radio group in a `<fieldset>`. Container 44 px high (1 px `line-strong`, radius md, 3 px padding); segment 36 px, radius sm, 14 px / 500, padding 0 0.875rem (`fullWidth`: equal columns). Selected: `brand` fill, white, 600. Hover: `brand-soft`. Focus: ring on the segment. Arrow keys move the selection (native). The radio input is invisible and covers its segment exactly (see section 8, hidden inputs). Used for month / year, insurance mode, coverage, gearbox, ranking order. Preview: components, rankings, car. |
| `SortDirectionSwitch`, type `SortDirection = "asc" \| "desc"` (`SortDirection.tsx`) | `name? = "dir"`, `labels: { legend, asc, desc }`, `value?` / `defaultValue? = "asc"`, `onChange?(dir)`, `demo?` (preview), `className?` | The ranking order: a `SegmentedSwitch` with two options, "Od najniższej" (`asc`, first, default) and "Od najwyższej" (`desc`); hidden legend "Kolejność". Same box as the period switch: 44 px high (1 px `line-strong`, radius md, 3 px padding), segments 36 px, 14 px / 500. Below 640 px the fieldset is `w-full` and the two segments are equal halves of the row; from 640 px it is as wide as its labels (pl at 1280 px: box 228.7 x 43.6 px, segments 107.1 x 36 and 114 x 36). States: default (`ink` on `surface`); hover (unselected segment, `brand-soft`); selected = active (`brand` fill, `on-brand`, 600); focus (3 px ring on the segment, offset 2 px). No disabled state: the order can always be changed, also while the list is empty, loading or failed. Keyboard: Tab enters the group on the selected segment; arrow keys move and select (native radios); Space selects. The labels name the direction of the value, not of the cost, so the same two words fit all nine metrics (amounts and consumption). Preview: components (both values, hover, focus), rankings, rankings-desc. |
| `ClearFiltersButton` (`FiltersPanel.tsx`) | `label`, `active`, `status? = ""`, `onClear?`, `demo?` (preview), `className?` | "Wyczyść filtry" at the top of the filter panel. Text button size sm (`buttonClass({ variant: "text", size: "sm" })`): 36 px high (44 on coarse pointers), padding 0 0.25rem, 14 px / 600; pl 93.8 x 36 px. **Default**: `brand`, 1 px underline, offset 3 px. **Hover**: `brand-strong`, 2 px underline. **Active** (pressed): `brand-deep`. **Focus**: 3 px `brand` ring, offset 2 px, radius md. **Disabled** (`active={false}`, no filter on): `ink-muted`, no underline, `not-allowed` cursor; it is **still rendered and still focusable**: `aria-disabled="true"` instead of `disabled`, and a click or Enter does nothing. Next to the button a visually hidden `role="status"` span holds `status` (polite). The wrapper carries `data-clear-filters`. Preview: components (all five states), rankings, rankings-no-filters, rankings-filters-open, rankings-filters-open-none. |
| `FiltersHeading` (`FiltersPanel.tsx`) | `title`, `action?`, `className?` | Heading row of the filters sidebar: h2 (display 22 px / 600, line 28 px) left, `action` right, `items-center`, gap 0.75rem, 1rem below (`mb-4`, as the bare h2 had). The action box has `-my-1 -mr-1`, so the row stays 28 px high and the button text ends exactly on the content edge of the panel (measured at 1280 px: text right edge = field right edge = 323.6 px; button centre = h2 centre). Preview: rankings (sidebar), components. |
| `FilterChip` (`Choice.tsx`) | `name`, `value`, `checked?` / `defaultChecked?`, `disabled?`, `onChange?(checked)`, `count?`, `children` | Checkbox drawn as a pill: 40 px high (44 on touch), padding 0 0.875rem, 14 px / 500, 1 px `line-strong`. Hover: `brand` border, `brand-soft`. Active (checked): `brand-tint`, 2 px `brand` border, tick icon before the label. Disabled: `sunken`, `line` border, `ink-muted`. Count after the label in `ink-muted`. The checkbox input is invisible and covers the pill exactly (see section 8, hidden inputs). Preview: components, rankings (sidebar, sheet). |
| `CheckboxRow` (`Choice.tsx`) | as `FilterChip` | Native 20 px checkbox (`accent-color: brand`) + label on a 40 px row (44 on touch), count on the right. Hover `brand-soft`; checked label 600; focus ring inside the row; disabled `ink-muted`. The checkbox has a 0.75rem block scroll margin, so the whole row is in view when it receives focus inside a scrolling list. Used for the list of makes. Preview: components, rankings. |
| `SearchCombobox` (`SearchCombobox.tsx`, client) | `labels: { label, placeholder, clear, noResultsTitle, noResultsHint, loading }`, `options: SearchOption[]` (`id`, `href`, `title`, `meta: ReactNode`, normally `<CarMeta>`, `trailing?`), `query?` / `defaultQuery?`, `onQueryChange?`, `onSelect?`, `statusText?`, `loading?`, `size?: "md" \| "lg"`, `className?` | Field 44 px (md) or 56 px (lg, home hero), search icon left, clear button right when text is present. **Closed**; **keyboard focus** (ring on the box); **open with results**: popover 0.5rem below, `surface`, radius md, `shadow-popover`, max height 22rem, at most 8 options, each at least 52 px, top-aligned: name 16 px / 500 printed in full (wraps, never truncated), attributes 13 px (body type, fuel, gearbox, power: two cars can share a name), price right in display 600; active option `brand-tint` with a 2 px inset `brand` outline; **no results**: title 16 px / 600 + hint 14 px; **loading**: one line of text. Behaviour: WAI-ARIA combobox with list autocomplete; Down / Up move (wrapping), Home / End, Enter opens the active option, Escape closes the list and, pressed again, clears the field; pointer hover sets the active option; a polite live region announces `statusText`. Default selection action: navigate to `option.href`. Preview: components (all four states), home, compare-empty, not-found. |
| `MetricSelector` (`MetricSelector.tsx`) | `metrics: { key, label, href }[]`, `current`, `labels: { label }`, `onSelectChange?(key)`, `id?` | Below 768 px: a labelled native `Select`. From 768 px: `<nav>` with a wrapping row of pill links, 40 px high, padding 0 1rem, 14 px / 500, gap 0.5rem; current: `brand` fill, white, 600, `aria-current="page"`; hover: `brand` border, `brand-soft`. Preview: rankings, components. |
| `LinkList` (`MetricSelector.tsx`) | `items: { href, title, description }[]`, `label` | The nine rankings on the home page: one bordered panel divided by hairlines, 1 / 2 / 3 columns (base / 640 / 1024 px). Cell min height 72 px, padding 1rem 1.25rem; title display 18 px / 600, description 14 px `ink-muted`. Hover: `brand-soft`, title underlined. Focus ring inside the cell. Preview: home. |
| `CompareToggle` (`CompareToggle.tsx`) | `pressed`, `labels: { add, added, fullHint }`, `carName`, `full?`, `size?: "sm" \| "md"`, `describedBy?`, `showHint?` + button attributes | Toggle button (`aria-pressed`). sm 36 px (44 on touch), md 44 px. Off: plus icon + "Porównaj", secondary look. On (in comparison): tick + "W porównaniu", `brand` fill. **Full** (3 cars chosen, this one is not): disabled look (`sunken`, `line` border, `ink-muted`), `aria-disabled`, stays focusable. The reason is always readable text, never a `title`: in a list pass `describedBy={COMPARE_BAR_HINT_ID}`, the button then points to the hint line of the comparison bar, which is visible at every width; for a toggle that stands alone (car page) pass `showHint`, which prints `fullHint` under the button (info icon 16 px + 14 px `ink-muted`, max 28rem, linked with `aria-describedby`). Activating a full toggle adds nothing: the caller sets `notice` on `CompareBar`. Accessible name includes the car name. Preview: components (ranking item, compare toggle), rankings, rankings-full, car, car-long-name. |
| `Sheet`, `SheetDisclosure` (`Sheet.tsx`, client; styles `.sheet` in `globals.css`) | `Sheet`: `open`, `onClose`, `title`, `closeLabel`, `children`, `footer?`, `headerAction?`. `SheetDisclosure`: `triggerLabel`, `triggerIcon?`, `triggerVariant?`, `triggerSize?`, `badge?`, `title`, `closeLabel`, `applyLabel?`, `headerAction?`, `children` | Modal `<dialog>`. Below 768 px a bottom sheet: full width, max height 90dvh, top radius lg, `shadow-raised`. From 768 px a right drawer: 26rem wide, full height, `shadow-popover`. Header 60 px: title (display 22 px) and a 44 px close button; scrolling body padding 1.25rem; optional pinned footer with a full-width primary button. Only the body scrolls: the dialog is clipped (`overflow: clip`, with `hidden` as the fallback) and never scrolls, so the header and the footer stay in place; the body is a positioned element with 1rem block scroll padding, so a control that receives focus is scrolled into view inside it with room for its ring. Backdrop `scrim`. Closes with Escape, the close button, the footer button or a click on the backdrop; focus returns to the trigger (native dialog). `badge` shows a count pill on the trigger (active filters). `headerAction` (T46) sits in the header between the title and the close button (gap 0.5rem); the filters sheet puts `ClearFiltersButton` there. Opening a sheet always focuses the close button (the sheet calls `focus()` on it after `showModal()`), never the header action, so Enter right after opening cannot clear the filters; for sheets without a header action this is the previous behaviour (the close button was already the first focusable element). Preview: rankings-filters-open, rankings-filters-open-none, rankings-assumptions-open. |

### 5.3 Data display

| Component | Props | Description and states |
|---|---|---|
| `CostStrip` (`CostStrip.tsx`); also `COST_ORDER`, `COST_FILL`, `ValueBar` | `shares: Partial<Record<CostKey, number>>`, `size?: "sm" \| "lg"`, `ratio? = 1`, `emphasis?: CostKey`, `animate?`, `label?` | The signature element. Segments in the fixed order depreciation, fuel, insurance, service, parts, fees, 2 px `surface` gaps, each at least 2 px wide. sm: 8 px high, radius 2 px (lists, comparison header). lg: 24 px, radius sm (car page). `ratio` = length relative to the longest strip in the list, on a `sunken` track. `emphasis` keeps one category in colour and greys the rest (`line-strong`) for single-category rankings. `animate` plays `strip-grow` once. Decorative (`aria-hidden`) unless `label` is given. `ValueBar { ratio }`: 8 px single `brand` bar for rankings by one number. Preview: components, home, rankings, car, compare. |
| `CostBreakdown` (`CostBreakdown.tsx`) | `items: CostBreakdownItem[]` (`key`, `label`, `amount`, `share`, `shareText`), `total`, `labels: { caption, category, amount, share, total, estimateSr }`, `animate?`, `footer?` | Large strip, then a table: one row per category (12 px colour square, label 16 px, amount display 18 px / 600 with "≈", share 14 px `ink-muted`), rows divided by `line`, 0.75rem vertical padding. Total row above a 2 px `ink` rule, amount 22 px. `footer` holds the residual-value and cost-per-kilometre sentences (14 px). Preview: car. |
| `RankingItem`, `RankingList` (`RankingItem.tsx`) | `rank`, `href`, `name`, `meta: ReactNode` (normally `<CarMeta>`), `detail?`, `value`, `valueCaption`, `estimate?`, `estimateSrLabel?`, `bar?: { kind: "strip", ratio, shares, emphasis? } \| { kind: "value", ratio }`, `action?` (slot for `CompareToggle`); `RankingList`: `label`, `children` | `RankingList` is an `<ol>` panel with hairline dividers and a container query. Row padding 1rem (1rem 1.25rem wide). **Narrow** (list under 48rem), grid `1.75rem / 1fr / auto`: line 1 rank and the name on the full width (display 18 px / 600, printed in full); line 2 attributes 14 px left and the value right (display 22 px / 600) with a 13 px caption; then the bar (0.625rem above); then detail left and the toggle right. **Wide** (48rem or more): one line, columns `2.25rem / 1fr / 8.5rem / 9.5rem`; name, attributes, detail and bar stacked in the second column, value and toggle centred vertically. The whole row is the link (stretched over the row); the toggle sits above it. States: default; hover `brand-soft` and underlined name; focus (ring inside the row); in comparison (toggle pressed); comparison full (toggle disabled). Preview: components, rankings, rankings-long-names, home, home-long-names. |
| `ComparisonTable` (`ComparisonTable.tsx`) | `cars: ComparisonCar[]` (2 or 3; `slug`, `href`, `make`, `variant`, `meta: ReactNode`, `shares`), `rows: ComparisonRow[]` (`key`, `label`, `values[]`, `best: number \| null`, `bestLabel`, `notes?: (string \| null)[]`, `estimate?`, `emphasis?`, `groupStart?`), `labels: { caption, rowHeader, remove, removeShort, estimateSr, cars }`, `onRemove?(slug)`, `footer?` | Panel. **From 768 px:** fixed-layout table, label column 13rem (15rem from 1024 px), car columns equal; header cell (padding 1.25rem): name link printed in full (display 18 px / 24 px, from 1024 px 22 px / 28 px), attributes 14 px, small strip, "Usuń" at the bottom; rows 0.75rem 1.25rem, values display 18 px / 600; `groupStart` and the total row have a `line-strong` rule; total row (`emphasis`): `brand-soft` band, 28 px figures. **Below 768 px:** first an ordered list of the cars, one per row on the full width (padding 0.75rem 1rem, hairlines between): number in a 24 px `brand-strong` square, name link printed in full (display 18 px / 24 px, at least 24 px high), attributes 14 px, small strip, and an icon-only remove button on the right (32 px, 44 on touch). Then the table: its header is sticky at the top and is only a key, each cell holding the car's number (20 px square) and the start of its name (13 px / 600, at most 2 lines); the row label sits on its own line above the values, so 3 cars fit in 320 px; values 16 px (total 18 px). Best value: tick + word ("najniżej" / "najwyżej") in `positive` on `positive-soft`, beside the value (below it on phones). **One mark per row at most:** `best` is the index of the single car whose value is better than every other value of the row, compared as the values are printed (after rounding). When two or three cars share the best printed value, `best` is `null` and no car is marked, also when the remaining car is worse: the mark means "this car alone wins the row", and equal figures set in tabular numerals side by side already read as equal. No mark either when values are not comparable (consumption in different units or with a plug-in hybrid) or in the power row. `notes`: 13 px `ink-muted` line under a value (kind of power). "–" in `ink-muted` when a value does not apply. `footer`: slot under the table (hairline above, padding 0.75rem 1rem, 1.25rem from 768 px) for an `InfoNote`. Preview: compare (3 cars), compare-2-cars, compare-long-names. |
| `CompareBar` (`CompareBar.tsx`, client); also `COMPARE_BAR_HINT_ID` | `cars: { slug, name, meta: ReactNode }[]` (0 to 3), `compareHref`, `labels: { region, toggle, count, list, compare, compareIdle, needMore, empty, full, remove, clear }`, `notice?`, `onRemove?`, `onClear?`, `position?: "fixed" \| "static"`, `hintId?`, `showWhenEmpty?`, `defaultExpanded?` (preview) | `<aside>` on `brand-deep`, fixed to the bottom edge (safe-area padding), `shadow-raised`, z 30, padding 0.5rem 1rem (side 1.5 / 2rem from 768 / 1024 px). One pattern at every width. **Closed:** a disclosure button with the count ("Wybrane: 2 z 3", display 18 px / 600, 44 px high, chevron 20 px, `aria-expanded`, `aria-controls`), the action on the right (signal button, 44 px; below 640 px without icon and with 1rem side padding; with 0 or 1 car the same button in its disabled look, labelled "Porównaj", at every width, so the action keeps its place when the second car arrives), and under them the hint line (13 px `on-brand-muted`, `role="status"`; its id is `hintId`, by default `compare-bar-hint` (`COMPARE_BAR_HINT_ID`) for the fixed bar and a generated id for a static one, so two bars never share an id). From 1024 px the closed bar also shows the selected cars in one row between count and action (equal columns, gap 0.5rem), followed by "Wyczyść". **Open** (button pressed): the list of cars appears above the count row, 1 column below 768 px and equal columns from 768 px, max height 60dvh with its own scroll, then "Wyczyść" (text button, 44 px) on its own line. **Car entry:** `brand-strong` box, radius md, padding 0.375rem 0.25rem 0.375rem 0.75rem; name 14 px / 600 white, cut to one line with an ellipsis in the closed row and printed in full in the open list; attributes 13 px `on-brand-muted`, always wrapping in full; remove button 32 px (44 on touch) with the close icon, hover `brand`. The open list closes on Escape (focus returns to the button), on a second press, and when focus leaves the bar. After a car is removed or the selection is cleared the bar moves focus itself (section 8, focus after removing a car); the list stays open. **0 cars**: not rendered (with `showWhenEmpty`: plain count text, hint, disabled action). **1 car**: hint "add one more", disabled action. **2 cars**: action "Porównaj 2 auta", no hint. **3 cars (full)**: hint "Komplet…", action "Porównaj 3 auta". **Limit message:** with `notice` the hint line shows that text in white / 600 with a 16 px `signal` alert icon and is announced (`role="status"`). **Reserved space:** while the fixed bar is shown it writes its closed height to `--bar-height` on `<html>`, closed or open (rule in section 3.1). The closed bar is measured directly (`offsetHeight`). While the list is open the bar also lays out a closed copy of itself and measures that: a `<div>` inside the `<aside>`, fixed to the bottom edge at full width with the same safe-area padding, `visibility: hidden`, `pointer-events: none`, `aria-hidden`, `inert`, holding the same elements and classes as the closed bar but no ids, names, handlers, live regions or link target. It is never visible, focusable or announced; it exists only while the list of a fixed bar is open. Preview: components (closed 0 to 3, open 1 to 3, limit message), rankings, rankings-full, car, compare. |
| `EarningsScale` (`EarningsScale.tsx`) | `levels: EarningsLevel[]` (always 4: `level`, `label`, `range`, `note`) | Ordered list of four blocks, 2 px gaps, radius lg; 1 column, 2 columns from a 32rem container, 4 from 56rem. Each block: meter (4 bars, 1 to 4 filled: how heavily the car weighs on the budget) + label in the level colour (display 18 px / 600), income range (display 18 px, 22 px in columns), note 13 px. Levels: comfortable `positive` on `positive-soft`; reasonable `brand` on `brand-soft`; stretch `caution` on `caution-soft`; not_recommended `danger` on `danger-soft`. Meaning is carried by label and meter, colour is third. Preview: car, components. |
| `Estimate`, `EstimateNote`, `InfoNote`, `IndicativeTag`, `PriceDate`, `DataFreshness` (`Markers.tsx`) | `Estimate { children, srLabel }`; `EstimateNote { children }`; `InfoNote { children }`; `IndicativeTag { children }`; `PriceDate { label, isoDate, dateText, children? }`; `DataFreshness { children, tone?: "light" \| "dark" }` | **Estimate marker**: "≈" in `ink-muted`, weight 400, before the amount; screen readers hear `srLabel` ("około" / "about"). **EstimateNote**: one 13 px line per screen explaining the sign, with a link to the methodology. **InfoNote**: a note on how to read the data of a screen: 16 px info icon in `ink` + 14 px `ink-muted` text, may contain a link; static text, no live-region role. Width: at most 65ch by default (`max-w-prose`, 514 px at its 14 px size); a max-width class passed in `className` replaces the default wherever it stands in the class list (the default is written without specificity, `[:where(&)]:max-w-prose`). Uses: under the fuel-consumption ranking (which cars it leaves out) and the power note under the comparison, both at the default width; on the car page (the entry stands for several versions) at 28rem, `className="max-w-md"`. **Indicative price marker**: text tag, 24 px high, `sunken`, 13 px / 500, radius sm; in lists the words appear as the caption under the price instead. **Price date**: 13 px line "Cennik z `<time>`" + optional source link. **Data freshness**: refresh icon + sentence with `<time>` elements; lives in the footer of every page. Preview: components, car, home. |
| `EmptyState`, `InlineError`, `Skeleton`, `RankingListSkeleton`, `CarPageSkeleton`, `ComparisonSkeleton` (`Feedback.tsx`) | `EmptyState { title, children, actions?, headingLevel? }`; `InlineError { title, children, action? }`; skeletons `{ label }` (+ `rows?`, `columns?: 2 \| 3`) | **Empty**: panel with a dashed `line-strong` border, title display 28 px, text 16 px `ink-muted`, actions row; no illustration. **Inline error**: `role="alert"`, `danger-soft` with a 1 px `danger` border, alert icon, title 16 px / 600, text 14 px, retry button. Every inline error of a page (list on home and rankings, cost panel on the car page, comparison) has the same retry action: secondary button, size sm, refresh icon, "Spróbuj ponownie" / "Try again"; it asks for the data again without reloading the page and shows the button's loading state meanwhile. **Skeletons**: `sunken` blocks with the sizes of the real layout, pulse animation, wrapper `role="status"` + `aria-busy` with a hidden label. Preview: components, rankings-empty, rankings-error, rankings-loading, compare-empty, compare-1-car, compare-loading. |
| `AssumptionsPanel`, `AssumptionsSummary` (`AssumptionsPanel.tsx`) | Panel: `idPrefix`, `labels: AssumptionsLabels`, `values: AssumptionValues`, `errors?: { annualMileageKm?, annualPremiumPln? }`, `onChange?(field, value)`. Summary: `label`, `summary`, `action` | Panel: mileage (`NumberField`, unit km, hint), ownership period (`Select`, 1 to 10 years), rule, insurance mode (`SegmentedSwitch`: estimate / own premium); estimate shows driver age (`Select`, nine bands) and coverage (`SegmentedSwitch`: OC / OC + AC); own premium shows one `NumberField` (unit zł, hint). Summary: one-line panel with the gauge icon, "Założenia: …" and the "Zmień" button that opens the panel in a `Sheet`. Preview: components (both modes, with errors), car (aside), rankings-assumptions-open. |
| `FiltersPanel`, `ActiveFilters` (`FiltersPanel.tsx`) | Panel: `idPrefix`, `labels: FiltersLabels`, `query?`, `priceMin?`, `priceMax?`, `priceError?`, `transmission?`, `bodyTypes`, `fuelTypes`, `segments`, `makes` (`FilterOption[]`: `value`, `label`, `count?`, `selected?`, `disabled?`), `onTextChange?`, `onTransmissionChange?`, `onToggle?(group, value, checked)`. Active: `items: { key, label }[]`, `labels: { list, remove, clear }`, `onRemove?`, `onClear?` | Panel order: text query, price from / to (two fields side by side, shared error line), body type chips, powertrain chips, gearbox switch (any / manual / automatic), segment chips, makes (scrolling list of `CheckboxRow`, max height 16rem). An option with no cars is disabled, not hidden. `ActiveFilters`: row of removable `brand-tint` chips (36 px, 44 on touch) and a "Wyczyść filtry" text button; renders nothing when no filter is on. It stays as it is beside the panel's own clear button (section 6.2). The same file exports `ClearFiltersButton` and `FiltersHeading` (section 5.2). Preview: rankings (sidebar, chips row), rankings-filters-open. |
| `Prose`, `Notice`, `DataTable` (`Prose.tsx`) | `Prose { children }`; `Notice { title, children }`; `DataTable { caption, columns, rows }` | **Prose**: measure 65ch (`max-w-prose`, 588 px), 16 px / 26 px, h2 28 px with 3rem above and 0.75rem below, h3 22 px, lists, links in `brand` underlined. **Notice** (disclaimers): bordered box (`line-strong`), title display 18 px, text 14 px. **DataTable**: bordered table with a visible caption, header band on `ground`; below its 40rem minimum width it scrolls sideways inside its own focusable region, the page does not. Preview: methodology. |
| `CarName`, `nameWrapClass` (`CarName.tsx`) | `CarName { children: string }` | Prints a car name in full and adds a line-break opportunity (`<wbr>`) after every "/", so names such as "Longitude/Limited/High Altitude/S" break between trim levels. The element around it carries `nameWrapClass` (`overflow-wrap: anywhere`), which lets any other long token break and keeps the name from widening a table column or flex item. Used by every component that prints a name (section 7.1). |
| `CarPhoto` (`CarPhoto.tsx`, client); also the types `CarPhotoData`, `CarPhotoLabels` | `photo: CarPhotoData \| null` (`sources` at the standard Wikimedia widths 500 / 960 / 1280, `width`, `height` of the original, `author` plain text up to 120 characters, `license`, `licenseUrl \| null`, `sourceUrl` = Commons file page), `carName` (make + variant, as in the h1), `labels: { alt, marker, credit, creditPublicDomain, publicDomain, source, unknownAuthor }` (templates, section 9.5), `className?` (placement only) | Illustrative model photo on the car page. `<figure data-car-photo>`: frame + `<figcaption>`. **Frame:** full width of its slot, radius lg, 1 px `line` border, `sunken` fill, `overflow: hidden`; its `aspect-ratio` is the photo's own (`width / height`) clamped to 4:3 … 2.4:1, and the `<img>` fills it with `object-fit: cover` (centred), so a photo inside that range is shown whole and only a taller or a wider one is cropped; no letterbox. **Image:** plain `<img>` (never `next/image`), `srcset` of the given sources with `w` descriptors, `sizes="(min-width: 64rem) 22rem, (min-width: 30rem) 28rem, calc(100vw - 2rem)"`, `src` = the 960 source (else the largest), `width` / `height` = original size, `alt` = `labels.alt` with `{name}` = `carName`, `loading="eager"`, `fetchpriority="high"`, `decoding="async"`. **Tag:** `IndicativeTag` with `labels.marker` ("Zdjęcie poglądowe"), absolute, 0.5rem from the top and left edges of the frame, `aria-hidden` (the alt text says the same). **Caption:** 0.5rem below the frame, 13 px `ink-muted`, `overflow-wrap: anywhere`; one sentence from `labels.credit` with `{author}`, `{license}`, `{source}`; `{license}` is a link to `licenseUrl` when it is set, plain text otherwise; `{source}` is always a link to `sourceUrl` with the text `labels.source`; both links `linkClass`, `target="_blank"`, `rel="noreferrer"`, 16 px external icon, at least 24 px high (the same pattern as the price source link). A licence whose short name starts with "Public domain" or "PD" uses `labels.creditPublicDomain` and prints `labels.publicDomain` instead of the short name; an empty author prints `labels.unknownAuthor`. **States:** photo; loading (the frame already has its final size, the `sunken` fill and the tag; nothing moves when the image arrives; no fade, no skeleton pulse); no photo (`photo === null` or no source): renders nothing; load failure (`onError`, and after mount an image that is `complete` with `naturalWidth === 0`, which covers a failure before hydration): renders nothing, exactly like no photo, never a broken-image icon. Preview: car, car-electric, car-long-name, car-no-photo, car-photo-error, components. |
| `CarMeta`, `PowerLabel`, `PowerDetail` (`CarMeta.tsx`) | `CarMeta { attributes: string[], power: { short, full } }`; `PowerLabel { short, full }`; `PowerDetail { value, note? }` | **CarMeta**: the attribute phrase that accompanies a name everywhere: body type, powertrain, gearbox, then the power label, joined by commas; wraps between attributes, never truncated. **PowerLabel** (short form): the short text is shown (`aria-hidden`), the full text is read instead (visually hidden); it never breaks inside. **PowerDetail** (full form, value of the power attribute): figure 16 px / 500 and under it a 13 px `ink-muted` explanation with a link to the methodology. Texts and rules: section 9.9. Preview: components (power labels), car, car-electric, car-long-name, compare. |
| `Icon` (`Icon.tsx`) | `name: IconName`, `size?: 16 \| 20 \| 24` | One set drawn for WheelWise: 24 px grid, 1.75 px stroke, round caps, no fills. Names: `search`, `chevron-down`, `chevron-right`, `arrow-left`, `check`, `plus`, `close`, `sliders`, `gauge`, `external`, `info`, `alert`, `compare`, `refresh`. Always `aria-hidden`. |
| `Logo`, `LogoMark` (`Logo.tsx`, outlines in `logo-paths.ts`), `src/app/icon.svg`, `src/app/apple-icon.png` | `Logo { tone?: "on-brand" \| "brand" }`, `LogoMark { size? = 28, tone? = "on-brand" }` | The user's logo, redrawn as inline SVG from the master `design/brand/wheelwise-logo.png` (2172 x 724 px PNG, source only, never served). Mark: a ring (outer radius 24, inner 19.35 in a 48-unit square) holding three bars that fall from left to right and join the lower half of the ring; bar width 7.7, gaps 2.95 with round bottoms, top corner radius 2.32. Wordmark "WheelWise": traced outline of the master's rounded heavy lettering (not a font; never retype it in Barlow or any other face). Colours: the ring and the wordmark take `currentColor` (the tone's text colour); the bars are three separate shapes (`LOGO_BARS`, left to right, drawn under the ring, which covers their lower ends; the thin strip under each gap is split at the gap centre, so the outline is unchanged) and take the six logo tokens, left to right blue (tallest), green (middle), orange (shortest): the user's final choice (T41, fourth note), all three vivid so the hues read even in the 16 px favicon. `tone="on-brand"`: bars `logo-blue`, `logo-green`, `logo-orange`; `tone="brand"`: bars `logo-blue-dark`, `logo-green-dark`, `logo-orange-dark` (the bright trio is 1.99 to 2.79:1 on `surface`). **Never black:** each bar path carries an inline `style="fill: var(--color-logo-…, currentColor)"` from `BAR_FILLS` and a `data-logo-bar="1|2|3"` attribute; no generated `fill-*` utility is involved (a utility missing from a stale Turbopack build left a bar at the SVG default, black, in fix round 2), the variables come from `@theme static` so they are in every build, and if one were ever undefined the fallback is `currentColor`, the ring colour (the `<svg>` also carries `fill="currentColor"`). Contrast in section 4.2, every bar >= 3.36:1. `Logo`: viewBox `0 0 219.3 48`, rendered 146.2 x 32 px (fixed `width` / `height`, no layout shift), mark left, wordmark right, spacing as in the master; `tone="on-brand"` (default) sets `text-on-brand` for the header (`brand-strong`) and footer (`brand-deep`); `tone="brand"` sets `text-brand-strong` for light surfaces (`surface`, `ground`). The SVG is `aria-hidden`; the name comes from a `sr-only` "WheelWise" inside a `translate="no"` span, and in the header from the link's `aria-label` ("WheelWise, strona główna" / "WheelWise, home"). `LogoMark`: the mark alone, square, viewBox `0 0 48 48`, decorative; the ring takes the surrounding text colour, `tone` picks the bar colours as for `Logo`. Site icon `icon.svg` (32 x 32): `brand-strong` square, radius 7, mark 28 x 28 centred (2 px margin): white ring, bars `#4d9cff`, `#33d17a`, `#ff7a1a`. `apple-icon.png`: 180 x 180, opaque `brand-strong` square without rounding (iOS masks it), mark 120 x 120 centred, same colours. Sizes: `Logo.tsx` + `logo-paths.ts` path data 6.7 kB (2.3 kB gzipped; the whole `logo-paths.ts` 8.2 kB, 3.2 kB gzipped), inside the page HTML, no extra request; `icon.svg` 874 B; `apple-icon.png` 3.8 kB. |
| `format.ts` | `formatInteger`, `formatPln`, `formatPlnExact`, `formatDecimal`, `formatPercent`, `formatDate` (`value`, `locale`) | Section 10. |

## 6. Screen specifications

Common frame: `SiteShell` with `Header` and `Footer`; content inside `Container`. h1 uses `h1Class`. The comparison bar appears on every page while 1 to 3 cars are selected. Wherever a car name appears, its attributes (body type, powertrain, gearbox, power) appear with it.

### 6.1 Home (`/`; preview `home`)

1. Hero band on `brand-strong` (`data-surface="dark"`), padding 2rem 0 2.5rem (3.5rem 0 4rem from 768 px), content max width 42rem, left aligned: h1 (white), intro 18 px `on-brand-muted`, `SearchCombobox size="lg"` 1.5rem below.
2. Two ranked lists, each a section with h2, a one-line description, `RankingList` of 5 and a link to the full ranking (44 px high): "cheapest to buy" (`ValueBar`, value = indicative price, caption "cena orientacyjna", no toggle) and "lowest total cost" (`CostStrip`, value with "≈", caption "miesięcznie", no toggle, no detail line). One column below 1024 px (gap 3rem), two equal columns from 1024 px (gap 2rem).
3. "All rankings": h2 + `LinkList` with the nine metrics, 3.5rem above.
4. `EstimateNote`, 2rem above. The data freshness line is in the footer.

States: lists loading: `RankingListSkeleton rows={5}`; a list failing: `InlineError` with retry in its place, 1rem under the description line, with the home text of section 9.3 (it names no filters and no assumptions: the home page has no controls for either); the heading, the description and the link to the full ranking of that list stay, and so does the rest of the page.

### 6.2 Rankings (`/rankings`; preview `rankings`, `rankings-filters-open`, `rankings-assumptions-open`, `rankings-empty`, `rankings-error`, `rankings-loading`, `rankings-consumption`, `rankings-full`, `rankings-long-names`)

1. h1, then `MetricSelector` (1.5rem below).
2. Grid 1.5rem below: from 1024 px a 17.5rem filters sidebar (panel, padding 1.25rem, `FiltersHeading` with h2 "Filtry" and `ClearFiltersButton`, then `FiltersPanel`) and the list column, gap 2rem. Below 1024 px the sidebar is hidden; the filters sheet shows the same `ClearFiltersButton` in its header (`headerAction`).
3. List column, top to bottom: `AssumptionsSummary` with "Zmień" (opens the assumptions `Sheet` at every width); 1.5rem; title row: h2 "{metric}, {period}" with the car count under it (`aria-live="polite"`), and on the right a control group, in this order: the "Filtry" button (below 1024 px only; opens the filters `Sheet`, badge = number of active filters, no badge at 0), the month / year `SegmentedSwitch` (`fullWidth="narrow"`) and the `SortDirectionSwitch`, gap 0.5rem; the group wraps under the title when it does not fit. **Below 640 px** the group is `w-full` and the "Filtry" button and the period switch get `max-sm:grow`, so the controls fill the row: at 375 px "Filtry" and the period switch share the first row and the order switch is a full row under them; at 320 px they are three full-width rows ("Filtry", period, order), two when there is no badge; for `price` and `fuelConsumption` (no period switch) "Filtry" and the order switch take a row each. **From 640 px** each control has its own width; at 768 px the group is one row under the title; from 1024 px ("Filtry" hidden) period and order sit right of the title, bottom-aligned with the count line; 1rem; `ActiveFilters`; 1rem; `RankingList` of 10 with a `CompareToggle` on each row; 1.25rem; "Pokazano 10 z 287" left and the secondary button "Pokaż kolejne 10" right; 1.5rem; `EstimateNote` (cost metrics) or the consumption note (below).

For `price` and `fuelConsumption` the list title is the metric name alone and the month / year switch is not rendered: these values do not depend on the period.

**Order (T46, PLAN 4.13).** Default "Od najniższej" (`dir` absent from the URL); "Od najwyższej" writes `dir=desc`. The h2 does not change with the order (the switch beside it shows the order, and the h2 keeps naming what is ranked); the accessible name of the `RankingList` does: "{list title}, od najniższej" / "{list title}, od najwyższej" (`rankings.listLabel`), so a screen-reader user entering the list hears the order. Rank numbers are the position in the order shown: with "Od najwyższej" rank 1 is the highest value; cars without a value are left out of the list in both orders. Bars keep `ratio = value / largest value in the visible list`, so with "Od najwyższej" the first bar is the full one. The home page lists have no order switch and stay ascending.

**Clearing filters (T46).** One button, the same at every width, at the top of the filter panel: in the sidebar heading row from 1024 px and in the header of the filters sheet below 1024 px (bottom sheet below 768 px, right drawer from 768 px). It removes `make`, `segment`, `body`, `fuel`, `gear`, `pmin`, `pmax`, `q` and keeps metric, order, period and assumptions. With no filter on it stays in place in its disabled look (section 5.2), so the panel never shifts and the control is where the user last saw it. The two other "Wyczyść filtry" stay: the text button at the end of the active-filter chips (it disappears with the chips) and the action of the empty state; all three carry the same name because they do the same thing.

Fuel-consumption ranking: under the list an `InfoNote` says what the ranking leaves out. Default text: litres per 100 km, no plug-in hybrids, electric cars only when "electric" is the only selected powertrain. When that filter is on, the second text replaces it (kWh per 100 km). Texts: section 9.4.

Comparison full: the toggles of the other cars are disabled and point to the bar's hint line; after an attempt to add a fourth car the bar shows the limit message (preview `rankings-full`).

Mobile pattern for filters and assumptions: both are bottom sheets (90dvh max, scrolling body, pinned footer button: "Pokaż 287 aut" for filters, "Gotowe" for assumptions). Changes apply immediately; the footer button only closes the sheet. From 768 px the same sheets are right-hand drawers.

Bars: metrics `totalCost` and `maintenance` use the full `CostStrip`; `depreciation`, `fuelCost`, `insurance`, `service`, `parts` use `CostStrip` with `emphasis` on that category; `price` and `fuelConsumption` use `ValueBar`. `ratio` = value / largest value in the visible list. Captions under the value: "miesięcznie" / "rocznie" for costs, "cena orientacyjna" for price, "WLTP" for consumption. Values of `price` and `fuelConsumption` carry no "≈".

States: empty (`EmptyState`, h3, action "Wyczyść filtry"; count reads "0 aut"); error (`InlineError` with retry; filters and assumptions stay); loading (`RankingListSkeleton`). In all three the title row keeps the period and order switches, and the panel's clear button keeps its state (enabled while a filter is on). Previews of T46: `rankings-desc` (order "Od najwyższej"), `rankings-no-filters` (no chips, no badge, clear button disabled), `rankings-filters-open-none` (the sheet with the disabled clear button); `rankings` and `rankings-filters-open` show the enabled button.

### 6.3 Car details (`/cars/[slug]`; preview `car` petrol, `car-electric`, `car-long-name` hybrid with the comparison full, `car-no-photo`, `car-photo-error`)

Grid from 1024 px: content column + 22rem aside, gap 2.5rem. Below 1024 px one column and no aside.

**Structure and photo placement.** Under the back link the page has four blocks, in this DOM order: **head** (h1, price block, several-versions notice, compare toggle), **photo** (`CarPhoto`), **body** (attributes, cost section, earnings section), **aside** (assumptions). The DOM order is also the reading and focus order at every width.

| Width | Rule |
|---|---|
| base (below 640 px) | One column, normal flow. Photo 2rem (`mt-8`) below the compare toggle (below its hint when the comparison is full), full content width; attributes 2rem below the photo caption. At 375 px: frame 343 x 229 px for a 3:2 photo, caption 2 lines. |
| 640 px | Same flow. The photo is at most 28rem wide (`max-w-md`), left-aligned: the same left edge and the same maximum width as the price explanation and the notice, so head and photo form one text column. |
| 1024 px | The wrapper of the four blocks becomes `lg:grid lg:grid-flow-row-dense lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10`, no row gap. Head `lg:col-start-1` (row 1); photo `lg:col-start-2 lg:mt-0 lg:max-w-none lg:self-start` (row 1: top of the right column, its top edge level with the top of the h1, 22rem = 352 px wide); body `lg:col-start-1` (row 2, attributes 2rem under the head, as before); aside `lg:col-start-2 lg:row-span-2 lg:[[data-car-photo]~&]:mt-8`. With a photo the aside takes rows 2–3 and its panel starts 2rem under row 1, level with the attributes; without a photo, dense placement puts the aside in rows 1–2, exactly as on a page without photos. Row 1 is as tall as the taller of head and photo. The head is normally the taller (334 px with a one-line name against 283 px for the 3:2 Sandero photo at 1280 px), so the content column is laid out identically with and without a photo; only a 4:3 photo with a three-line caption next to a one-line name (about 338 px against 334 px) would start the body a few pixels lower, under the photo. |
| 1280 px | Same as 1024 px; the content column is 744 px wide (568 px at 1024 px), the photo stays 352 px. |

Classes: `src/app/[locale]/design-preview/_components/CarScreen.tsx`; copy them as they are.

**No photo: the slot is omitted, no placeholder.** A grey box saying "no photo" tells nothing about the car, would cost about 300 px above the attributes on a phone, and would appear on every model without a free photo and on every new model until the photo list is refreshed. The page was complete before photos existed; the photo is an addition that may be absent.

**Layout-jump rule.** Loading never moves anything (the frame has its final size before the image arrives). Content above the photo slot never moves. When the photo fails to load, the slot is removed once: below 1024 px everything under it moves up by the slot height + 2rem (frame + 0.5rem + caption + 2rem: 317 px at 375 px with the Sandero photo) and by no more; from 1024 px the content column does not move (0 px) and only the assumptions aside moves up into the freed top of the right column. Measured in `car-photo-error` (every thumbnail answers 404): attributes at 981 → 664 px from the top of the document at 375 px (317 px, the slot), 586 → 586 px at 1280 px; afterwards the page is identical to `car-no-photo` (same positions at 375 and 1280 px).

**Loading priority.** The photo is the largest element of the first viewport from 1024 px (352 x 235 px, larger than the h1) and starts about 660 px down at 375 x 812, so it is a likely Largest Contentful Paint: `loading="eager"`, `fetchpriority="high"`, `decoding="async"`, `src` and `srcset` in the server HTML. `sizes` makes 1x screens load the 500 px file and 2x and 3x phones the 960 or 1280 px file; no other width is ever requested.

Content column: back link to rankings (44 px high); h1 = make + variant, printed in full (`CarName`, `nameWrapClass`); price block 1.5rem below: price (display 36 px) + `IndicativeTag`, a 14 px explanation (max 28rem), `PriceDate` with the source link (opens in a new tab, external icon), then 1rem below the several-versions notice (`InfoNote className="max-w-md"`: max 28rem = 448 px, the same width and left edge as the price explanation above it, so the price block is one text column; on every car page); `CompareToggle size="md" showHint` 1.25rem below (when the comparison is full and this car is not in it, the reason is printed under the button); attributes as a `<dl>` grid (2 / 3 / 4 columns at base / 640 / 1280 px; term 13 px `ink-muted`, value 16 px / 500; hairlines), in the order body type, segment, powertrain, gearbox, power, engine size, consumption. The power attribute uses the full power label (section 9.9): its term is the full label, its value is `PowerDetail`; when it has an explanation (hybrid, plug-in hybrid, electric) the cell spans 2 columns; section "Koszt posiadania": h2 with the month / year switch on the right, `AssumptionsSummary` (below 1024 px only), panel with the total (display 48 px with "≈"), the line "{period}, licząc {n} lat posiadania" and `CostBreakdown animate`; `EstimateNote`; section "Jakie zarobki na to auto": h2, one sentence, `EarningsScale`.

Aside (from 1024 px): sticky panel (top 1.5rem) with h2 "Założenia" and `AssumptionsPanel`.

States: loading `CarPageSkeleton`; unknown slug: the 404 page; cost calculation impossible (the market prices or other data the calculation needs cannot be read): the section keeps its h2 "Koszt posiadania" and shows, 1rem below it, an `InlineError` with retry in place of the cost panel (texts: section 9.5). In this state the month / year switch, the `AssumptionsSummary`, the `EstimateNote` and the whole earnings section are not rendered. Everything above the section stays: name, price block, notice, compare toggle, photo, attributes. The assumptions aside (from 1024 px) also stays, so the column widths do not change and a retry uses the values shown there.

### 6.4 Comparison (`/compare`; preview `compare`, `compare-2-cars`, `compare-long-names`, `compare-1-car`, `compare-empty`, `compare-loading`)

h1 with the month / year switch on the right (wraps under the h1 on phones); `AssumptionsSummary`; `ComparisonTable`; `EstimateNote`. With 2 cars, a section "Dodaj trzecie auto" with a `SearchCombobox` (max width 28rem) follows.

Rows, in order: indicative price (lowest marked; no "≈"); depreciation (starts a group), fuel and energy, insurance, servicing, parts and wear, fees (lowest marked, "≈"); total (emphasis band, lowest marked); value after n years (starts a group; highest marked); consumption (lowest marked only when all cars use the same unit and none is a plug-in hybrid); power (full value "67 kW (91 KM)", under it the kind of power for hybrids and electric cars, never a best mark).

When at least one car is a hybrid, plug-in hybrid or electric car, the table footer holds an `InfoNote` about power with a link to the methodology.

Mobile layout (below 768 px): the list of cars with whole names and attributes first, then three (or two) equal columns inside the panel with the sticky key header (number + start of the name), row labels on their own line; no sideways scrolling at 320 px, also with three 103-character names.

States: fewer than 2 cars: `EmptyState` (title "Dodaj co najmniej 2 auta", or "Dodaj jeszcze jedno auto" with 1 car) containing a `SearchCombobox` and a link button to the rankings; the switch and assumptions are hidden. Loading: `ComparisonSkeleton`. Catalogue cannot be loaded: the page keeps its frame, as home, rankings and the car page do: the h1 stays and, 1.5rem below it (the place of the skeleton), an `InlineError` with retry is shown, max width 42rem (`max-w-2xl`), texts in section 9.6; the switch, the assumptions summary, the table, the estimate note and the "add a third car" section are not rendered. The selection is not touched: the address keeps its cars, the header badge and the comparison bar stay as they are. The document title stays that of the comparison. The error page (section 6.6) is not used for this state; it remains for failures that no state of a page covers.

### 6.5 Methodology (`/methodology`; preview `methodology`)

Grid from 1024 px: article + 16rem "On this page" navigation (sticky, top 1.5rem), gap 3rem; below 1024 px the navigation comes first, above the article. Article: h1, intro 18 px `ink-muted`, `Prose` sections (h2 each, with an `id` for the anchors; the section "Moc aut elektrycznych i hybryd", id `moc` / `power`, is the target of the power-label links), `DataTable` of data sources (source link, what is taken, update rhythm, licence) 3rem below, `Notice` with the disclaimers 2.5rem below. Heading order: h1, h2 per section.

### 6.6 Not found and error (preview `not-found`, `error`)

Left-aligned block, max width 36rem, padding 3rem 0 (5rem from 768 px).

- 404: h1, intro 18 px, `SearchCombobox`, primary link button "Zobacz rankingi" and secondary "Strona główna".
- Error: 24 px alert icon in `danger`, h1, intro, primary button "Spróbuj ponownie" (refresh icon) and secondary link "Strona główna".

Both pages set their own document title (section 9.11); the error page does not keep the title of the page that failed.

## 7. Responsive rules

- Mobile first; the layout is fluid between breakpoints (section 3.5). Verified at 320, 375, 768 and 1280 px; no page scrolls sideways at any of them (`scrollWidth <= clientWidth` on all 25 preview pages, Polish and English, including the pages filled with 100-character names). The five car pages (`car`, `car-electric`, `car-long-name` with a 103-character name, `car-no-photo`, `car-photo-error`) were measured again with the photo at 320, 375, 768 and 1280 px in both languages: no sideways scrolling.
- Car photo: below 1024 px in the flow under the compare toggle, at most 28rem wide; from 1024 px at the top of the right column (section 6.3).
- `RankingItem` and `EarningsScale` respond to the width of their container, not of the viewport, so the same row works in a half-width column on the home page and in the full-width list.
- Car names: section 7.1.
- The only element allowed to scroll sideways is `DataTable`, inside its own focusable region.
- Fixed comparison bar: the footer reserves `--bar-space` (the height of the closed bar at the present width, also while the list is open) so nothing ends up under the closed bar, and the page's scroll padding keeps focused controls above it (section 8); it respects `env(safe-area-inset-bottom)`.
- Text can be zoomed to 200%: sizes are in rem, containers have no fixed heights (controls use `min-height`).

### 7.1 Long car names

Names are cleaned from the source descriptions: the power marker (such as "(101ch)") and French words are removed and model names are in normal case ("Renault Clio"), so several cars may share a name and their attributes tell them apart. Names are still long: some reach 95 characters, some have "/"-joined parts and no spaces; layouts are checked with a 103-character stress name. One rule: **a name is printed in full and wraps**; it is cut only where a fixed strip must stay one line high, and there the whole name is one visible control away. Every name goes through `CarName` inside an element with `nameWrapClass`.

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
- **Focus not obscured (WCAG 2.2 SC 2.4.11):** while the fixed comparison bar is on the page, `<html>` has `scroll-padding-bottom` = height of the closed bar + 1rem, so the browser scrolls a newly focused control clear of the bar. The bar's open list is opened by the user, closes on Escape and closes by itself when focus leaves the bar, so it never covers a focused control of the page. Measured by tabbing through every control of the 17 preview pages that show the bar, at 375 x 812, 375 x 568 and 1280 x 800: no focused element is fully covered.
- **Older browsers:** two CSS features are newer than the oldest browsers the framework supports, and each has a defined fallback. `:has()` (missing in Firefox before 121): the scroll padding above the comparison bar does not depend on it there; `@supports not selector(:has(*))` gives `<html>` `scroll-padding-bottom: calc(var(--bar-height, 0px) + 1rem)`, which is the height of the bar + 1rem while a bar is shown and 1rem otherwise, so SC 2.4.11 holds in those browsers too. Measured in Firefox 119 on the rankings preview with the bar, at 375 x 667 and 1280 x 800: scroll padding 76 px and 104 px (bar 60 px and 88 px), no focused control fully covered. `@starting-style` and `transition-behavior: allow-discrete` (missing in Safari before 17.5 and Firefox before 129): sheets and their backdrop open and close at once, without the slide and the fade; the position, the modal behaviour, Escape and the return of focus are unchanged. This is the intended fallback (the same result as reduced motion); do not add a JavaScript animation for it.
- **Focus after removing a car (comparison bar):** the remove button that had focus leaves the page together with its car, so `CompareBar` moves focus itself; it is never left on `<body>`. While cars remain, focus goes to the remove button of the car that now holds the same place in the list (the next car), or to the remove button of the new last car when the removed car was the last one; an open list stays open. When no car remains (the last car was removed, or "Wyczyść" / "Clear" was pressed) the bar leaves the page and focus goes to `main#main`, the target of the skip link, without scrolling the page. The same happens for pointer and keyboard. If the user has already moved focus to a control outside the bar before the selection changes, focus stays there. Measured with Enter and Space at 375 and 1280 px with 3, 2 and 1 cars.
- **Focus and announcement after clearing filters (T46):** the panel's "Wyczyść filtry" (sidebar or sheet header) keeps focus: it is not removed and not natively disabled; it switches to `aria-disabled="true"`, so focus stays on it (screen readers read it as unavailable) and the user carries on in the panel. Its own polite status region then says "Filtry wyczyszczone" (set `status` after the clear, back to "" on the next filter change, so the text can be announced again); the region is inside the sidebar or the sheet, so it is announced also while the modal sheet makes the rest of the page inert. The car count line under the h2 announces the new count as before. The chips-row "Wyczyść filtry" and the empty-state action disappear with what they clear, so they keep their rule: focus goes to the list heading (`[data-results-heading]`). Measured in the preview at 1280 px: Enter on the panel button leaves focus on it; Tab reaches the button in its disabled state with the ring visible (`rankings-clear-none-focus-1280-pl`).
- **Order switch keyboard (T46):** one Tab stop (the selected segment); arrow keys change the order; after the list re-renders focus stays on the selected segment, so the switch must not be remounted when the URL changes. The count does not change with the order, so nothing else is announced; the radio announces its own new state. Measured in the preview: Tab reaches `input[name=dir]` with the ring drawn on its segment; ArrowRight from "Od najniższej" selects "Od najwyższej".
- **Hidden inputs and scroll containers:** the radio input of a switch segment and the checkbox input of a filter chip are invisible (`opacity: 0`, no native appearance) and cover their label exactly; the label is a positioned element. The input's box is therefore the box of the control: it scrolls with the control, and focusing it brings the whole control into view in the nearest scroll container. Never hide these inputs with `sr-only`. Every scroll container (sheet body, list of makes, search results, the comparison bar's open list) is a positioned element (`relative`), so visually hidden text inside it scrolls with its content. Measured in the filters and assumptions sheets at 375 x 667, 375 x 812 and 1280 x 720: at every focus stop the dialog's `scrollTop` is 0, the title and the close button are in the viewport and the focused control is completely inside the visible part of the body.
- **Target sizes:** all pointer targets are at least 24 x 24 CSS px; the only smaller ones are links inside a sentence (WCAG 2.5.8 inline exception). The car-name link of the narrow comparison is a block at least 24 px high. Primary actions (md buttons, search, nav links, sheet close and apply, compare action) are at least 44 px high. On coarse pointers (`pointer-coarse:`) small buttons, compare toggles, chips, checkbox rows, language links, footer links and remove buttons grow to 44 px. Segmented switches are 44 px high as a whole (segments 36 px).
- **Reduced motion:** with `prefers-reduced-motion: reduce` every animation and transition is cut to 0.01 ms and one iteration (global rule): the strip appears at full length, sheets open without sliding, skeletons do not pulse, the loading spinner does not turn (`aria-busy` carries the state).
- **Landmarks:** `header`, `nav` (main navigation, language, footer navigation, metric selector, breadcrumb, "on this page"; each with its own `aria-label`), `main#main`, `aside` (filters, assumptions, comparison bar), `footer`. The skip link targets `#main`.
- **Heading order:** one h1 per page; h2 for page sections and sheet titles; h3 for car names in ranking rows and for empty-state titles inside a section. No level is skipped.
- **Not colour alone:** estimates have a sign and a spoken word; best values have a tick and a word; scale levels have a name and a meter; selected chips have a tick and a thicker border; the current navigation item has weight and an underline; invalid fields have an icon and a message; cost categories are named in the table next to their colour.
- **Forms:** every control has a visible label (or `aria-label` for search); hints and errors are linked with `aria-describedby`; errors say what to enter. Groups use `fieldset` / `legend`.
- **Live regions:** search result count, ranking car count and comparison-bar count are polite live regions; the status beside the panel's clear button announces "Filtry wyczyszczone"; the comparison bar's hint line is a status region (it announces the limit message); inline errors use `role="alert"`; skeleton wrappers use `role="status"`.
- **Language:** `<html lang>` follows the locale; language links carry `lang` and `hrefLang`; the brand name has `translate="no"`.
- **Car photo:** `<figure>` with the attribution in `<figcaption>`; non-empty alt built from the car name ("Dacia Sandero: zdjęcie poglądowe modelu"); the visible tag on the photo is `aria-hidden` because the alt says the same; the two caption links have their visible text as accessible name ("CC BY-SA 4.0", "Wikimedia Commons"), open a new tab with the external icon like every external link, and show the standard ring. A failed image is removed, so no broken-image icon or stray alt text appears. axe (wcag2a, wcag2aa, wcag21aa, wcag22aa): 0 violations on `car`, `car-no-photo`, `car-photo-error`, `car-electric`, `car-long-name`, `components`, both languages, 375 and 1280 px.
- **Tables:** real `<table>` elements with captions, `scope` on headers; the comparison renders one of two tables per width, the other is `display: none`; below 768 px the cars are an ordered list before the table and the column headers repeat each car's number and whole name (cut only visually).

## 9. Microcopy

Source of truth for every string: `src/mocks/copy.ts` and `src/mocks/methodology.ts` (both languages, same keys). Rules: sentence case; plain verbs; second person; a control says what it does and keeps that name everywhere ("Porównaj" on the toggle, in the bar, in hints); errors say what happened and what to do, with no apology and no codes; no exclamation marks; Polish quotation marks „…”, English “…”; en dash for ranges (10–15%); ellipsis character in placeholders and loading texts. Polish plural forms: 1 auto, 2–4 auta, 5+ aut (and 12–14 aut). Where a text of the tables below has no key in the two mock files (error states of the car, home and comparison pages, the yearly earnings sentence, document titles), the table is the source.

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
| Body types | hatchback lub sedan, kombi, SUV, coupé, kabriolet, minivan, van | hatchback or saloon, estate, SUV, coupé, convertible, MPV, van |
| Powertrains | benzyna, diesel, LPG, hybryda, hybryda plug-in, elektryczny | petrol, diesel, LPG, hybrid, plug-in hybrid, electric |
| Gearbox (attribute) | skrzynia manualna, automat | manual gearbox, automatic |
| Segments | A mini, B miejskie, C kompaktowe, D średnie, E wyższe, F luksusowe | A mini, B small, C compact, D mid-size, E executive, F luxury |
| Units | KM; l/100 km; kWh/100 km | hp; l/100 km; kWh/100 km |
| Ownership period inside a sentence | Two forms, one table: section 9.10 ("1 rok, 2 lata, 5 lat"; after "po": "po roku, po 2 latach … po 10 latach") | Section 9.10 ("1 year, 2 years"; "after 1 year, after 2 years") |

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
| List error (either list; title, text, action) | Nie udało się wczytać rankingu; Sprawdź połączenie z internetem i spróbuj ponownie.; Spróbuj ponownie | The ranking could not be loaded; Check your internet connection and try again.; Try again |
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
| Error (rankings page: title, then text; the home page has its own text, section 9.3) | Nie udało się wczytać rankingu. Sprawdź połączenie z internetem i spróbuj ponownie. Filtry i założenia zostały zachowane. | The ranking could not be loaded. Check your internet connection and try again. Your filters and assumptions are kept. |
| Loading | Wczytuję ranking… | Loading the ranking… |
| Filters: title, apply | Filtry; Pokaż {n} auto / auta / aut | Filters; Show {n} car / cars |
| Filters: query | Marka lub model; np. Clio… | Make or model; e.g. Clio… |
| Filters: price | Cena orientacyjna; Od; Do; zł | Indicative price; From; To; zł |
| Filters: price error | Cena „od” jest wyższa niż „do”. Zamień je albo popraw jedną z nich. | “From” is higher than “To”. Swap them or correct one of them. |
| Filters: groups | Nadwozie; Napęd; Skrzynia biegów (Dowolna / Manualna / Automat); Segment; Marka | Body type; Powertrain; Gearbox (Any / Manual / Automatic); Segment; Make |
| Active filters | Włączone filtry; Usuń filtr: {nazwa}; Wyczyść filtry | Active filters; Remove filter: {name}; Clear filters |
| Clear filters in the panel (sidebar heading, sheet header): button; status after clearing (`filters.clear`, `filters.cleared`) | Wyczyść filtry; Filtry wyczyszczone | Clear filters; Filters cleared |
| Order switch: legend (hidden); options (`rankings.order.legend`, `.asc`, `.desc`) | Kolejność; Od najniższej; Od najwyższej | Order; Lowest first; Highest first |
| Name of the ranking list with its order (`rankings.listLabel`) | {tytuł listy}, od najniższej / {tytuł listy}, od najwyższej (Całkowity koszt, miesięcznie, od najwyższej) | {list title}, lowest first / {list title}, highest first |
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
| Cost section (period form A, section 9.10) | Koszt posiadania; {okres}, licząc {n lat} posiadania | Cost of ownership; {period}, over {n years} of ownership |
| Residual value (period form B, section 9.10; 1 year: "Po roku auto będzie warte …") | Po {n latach} auto będzie warte ≈ {kwota} ({p}% ceny). | After {n years} the car will be worth ≈ {amount} ({p}% of the price). |
| Cost per km | Każdy kilometr kosztuje ≈ {kwota}. | Every kilometre costs ≈ {amount}. |
| Estimate note | ≈ oznacza szacunek dla Twoich założeń, nie ofertę. Jak liczymy | ≈ marks an estimate for your assumptions, not an offer. How we calculate |
| Earnings: title | Jakie zarobki na to auto | The income this car calls for |
| Earnings: intro, monthly view ({kwota} = purchase price / (ownership years x 12) + monthly fuel / energy, PLAN 4.12; not the total cost) | Cena auta rozłożona na miesiące posiadania i paliwo lub prąd to razem ≈ {kwota} miesięcznie. Skala pokazuje, przy jakim miesięcznym dochodzie netto (na rękę) ta kwota zajmuje daną część budżetu. | The price of the car spread over the months you keep it, plus fuel or electricity, comes to ≈ {amount} per month. The scale shows the net monthly income (take-home pay) at which this amount takes a given share of the budget. |
| Earnings: intro, yearly view ({kwota} is 12 x the monthly amount; the ranges are 12 x the monthly ones; labels and notes of the four levels do not change) | Cena auta rozłożona na lata posiadania i paliwo lub prąd to razem ≈ {kwota} rocznie. Skala pokazuje, przy jakim rocznym dochodzie netto (na rękę) ta kwota zajmuje daną część budżetu. | The price of the car spread over the years you keep it, plus fuel or electricity, comes to ≈ {amount} per year. The scale shows the net yearly income (take-home pay) at which this amount takes a given share of the budget. |
| Level 1 | komfortowo; zakup i paliwo zajmują do 15% dochodu | comfortable; purchase and fuel take up to 15% of income |
| Level 2 | rozsądnie; zakup i paliwo zajmują 15–20% dochodu | reasonable; purchase and fuel take 15–20% of income |
| Level 3 | na granicy; zakup i paliwo zajmują 20–25% dochodu | stretching it; purchase and fuel take 20–25% of income |
| Level 4 | niezalecane; zakup i paliwo zajmują ponad 25% dochodu | not recommended; purchase and fuel take over 25% of income |
| Ranges | od {min}; od {min} do {max}; do {max} | from {min}; from {min} to {max}; up to {max} |
| Costs cannot be calculated: title | Nie udało się obliczyć kosztów tego auta | The costs of this car could not be calculated |
| Costs cannot be calculated: text | Nie mamy teraz danych potrzebnych do obliczeń, na przykład cen paliw i prądu. Spróbuj ponownie za chwilę. Założenia zostały zachowane. | The data needed for the calculation, such as fuel and electricity prices, is not available right now. Try again in a moment. Your assumptions are kept. |
| Costs cannot be calculated: action | Spróbuj ponownie | Try again |
| Loading | Wczytuję dane auta… | Loading the car… |
| Photo: alt text (`car.photo.alt`; {name} = make + variant) | {name}: zdjęcie poglądowe modelu | {name}: illustrative photo of the model |
| Photo: tag on the photo (`car.photo.marker`) | Zdjęcie poglądowe | Illustrative photo |
| Photo: caption (`car.photo.credit`; {license} = short name, a link when the licence URL exists; {source} = link to the file page) | Zdjęcie: {author}, licencja {license}, źródło: {source} | Photo: {author}, licence {license}, source: {source} |
| Photo: caption, public domain (`car.photo.creditPublicDomain`) | Zdjęcie: {author}, {license}, źródło: {source} | Photo: {author}, {license}, source: {source} |
| Photo: public domain (`car.photo.publicDomain`, printed as {license}) | domena publiczna | public domain |
| Photo: link to the file page (`car.photo.source`) | Wikimedia Commons | Wikimedia Commons |
| Photo: missing author (`car.photo.unknownAuthor`) | autor nieznany | unknown author |

Example captions: "Zdjęcie: Alexander-93, licencja CC BY-SA 4.0, źródło: Wikimedia Commons" / "Photo: Alexander-93, licence CC BY-SA 4.0, source: Wikimedia Commons". No photo: no text (the slot is omitted, section 6.3). The licence short name and the author are printed as Commons gives them (`CC BY-SA 4.0`, `CC BY-SA 3.0 de`, `© M 93`), never translated, except "Public domain".

### 9.6 Comparison

| Key | Polish | English |
|---|---|---|
| Title | Porównanie aut | Car comparison |
| Table caption, row header | Porównanie kosztów, {okres}; Pozycja | Cost comparison, {period}; Item |
| Date under the price of each car | Cennik z {data} | Price list of {date} |
| Rows ("Wartość po …": period form B, section 9.10; 1 year: "Wartość po roku") | Cena orientacyjna; (six cost categories); Razem; Wartość po {n latach}; Zużycie (WLTP); Moc | Indicative price; (six cost categories); Total; Value after {n years}; Consumption (WLTP); Power |
| List of cars (name, below 768 px) | Porównywane auta | Cars compared |
| Best marks | najniżej; najwyżej | lowest; highest |
| Remove | Usuń (name: Usuń z porównania: {auto}) | Remove (name: Remove from comparison: {car}) |
| Add third | Dodaj trzecie auto | Add a third car |
| Empty, 0 cars | Dodaj co najmniej 2 auta | Add at least 2 cars |
| Empty, 1 car | Dodaj jeszcze jedno auto | Add one more car |
| Empty text | Porównanie mieści 2 lub 3 auta. Wyszukaj je tutaj albo dodaj przyciskiem „Porównaj” w rankingu. | A comparison holds 2 or 3 cars. Search for them here or add them with the “Compare” button in a ranking. |
| Empty action | Przejdź do rankingów | Go to rankings |
| Loading | Wczytuję porównanie… | Loading the comparison… |
| Comparison cannot be loaded: title | Nie udało się wczytać porównania | The comparison could not be loaded |
| Comparison cannot be loaded: text | Sprawdź połączenie z internetem i spróbuj ponownie. Wybrane auta i założenia zostały zachowane. | Check your internet connection and try again. Your selected cars and assumptions are kept. |
| Comparison cannot be loaded: action | Spróbuj ponownie | Try again |

### 9.7 Methodology

Full text: `src/mocks/methodology.ts` (a design proposal; every figure must be checked against `src/config/cost-model.ts` before release).

| Key | Polish | English |
|---|---|---|
| Title | Jak liczymy | How we calculate |
| Intro | WheelWise nie zgaduje. Każda kwota na stronie powstaje z publicznych danych i jawnego modelu kosztów. Tu opisujemy, skąd bierzemy liczby i gdzie kończy się ich dokładność. | WheelWise does not guess. Every amount on the site comes from public data and an open cost model. This page says where the numbers come from and where their precision ends. |
| Contents label | Na tej stronie | On this page |
| Section headings | Ceny aut są orientacyjne; Z czego składa się koszt; Co oznacza znak ≈; Moc aut elektrycznych i hybryd; Skala zarobków; Jak często odświeżamy dane | Car prices are indicative; What the cost is made of; What the ≈ sign means; Power of electric and hybrid cars; The income scale; How often the data is refreshed |
| Income scale section (`methodology.sections.income`, id `zarobki` / `income`), paragraphs | 1. Skala pokazuje miesięczny dochód netto (na rękę), przy którym zakup auta i paliwo zajmują określoną część budżetu. Cenę auta dzielimy równo na miesiące wybranego okresu posiadania, jak ratę bez odsetek, i dodajemy miesięczny koszt paliwa lub prądu. 2. Ubezpieczenia, serwisu, części, opłat i utraty wartości w skali nie liczymy. Te kwoty są w koszcie posiadania na stronie auta, w rankingach i w porównaniu. 3. Progi opieramy na polskich zaleceniach: wydatki na transport nie powinny przekraczać 15–20% dochodu netto. Do zakupu i paliwa dochodzą jeszcze inne koszty auta, dlatego powyżej 25% auto jest niezalecane. Kwoty zaokrąglamy do 100 zł, a widok roczny to 12 razy kwota miesięczna. | 1. The scale shows the net (take-home) monthly income at which purchase and fuel take a given share of the budget. We divide the price of the car evenly over the months of the chosen ownership period, like an instalment without interest, and add the monthly cost of fuel or electricity. 2. Insurance, servicing, parts, fees and depreciation are not counted in the scale. They are part of the cost of ownership on the car page, in the rankings and in the comparison. 3. The thresholds follow Polish guidance: transport should take no more than 15–20% of net income. The other costs of the car come on top of purchase and fuel, so above 25% the car is not recommended. Amounts are rounded to 100 zł, and the yearly view is 12 times the monthly amount. |
| Income scale section, list | komfortowo: zakup i paliwo zajmują do 15% dochodu; rozsądnie: od 15% do 20%; na granicy: od 20% do 25%; niezalecane: ponad 25% | comfortable: purchase and fuel take up to 15% of income; reasonable: 15% to 20%; stretching it: 20% to 25%; not recommended: over 25% |
| Sources table | Źródła danych; columns: Źródło, Co z niego bierzemy, Aktualizacja, Licencja | Data sources; columns: Source, What we take from it, Updated, Licence |
| Sources table, row Wikimedia Commons (`methodology.sources.rows`, appended as the last row; `url`: https://commons.wikimedia.org/) | Wikimedia Commons; Zdjęcia modeli aut; ręcznie, gdy w katalogu pojawiają się nowe modele; CC BY-SA / CC BY / CC0 / domena publiczna, osobno dla każdego zdjęcia | Wikimedia Commons; Photos of car models; by hand, when new models enter the catalogue; CC BY-SA / CC BY / CC0 / public domain, per photo |
| Photos sentence (`methodology.sections.prices.paragraphs`, appended as the last paragraph) | Zdjęcia aut są poglądowe: pokazują model, niekoniecznie tę samą wersję lub generację, i pochodzą z Wikimedia Commons. Autora i licencję każdego zdjęcia podajemy pod nim. | Car photos are illustrative: they show the model, not necessarily the same version or generation, and come from Wikimedia Commons. The author and licence of each photo are given under it. |
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
| Document titles of both pages | Section 9.11 | Section 9.11 |

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

### 9.10 Ownership period in a sentence

The ownership period is a whole number of years from 1 to 10. It appears in two forms; every text that prints it uses one of them and no third wording.

| Form | Polish: 1 | Polish: 2, 3, 4 | Polish: 5 to 10 | English: 1 | English: 2 to 10 |
|---|---|---|---|---|---|
| A, count | 1 rok | 2 lata, 3 lata, 4 lata | 5 lat … 10 lat | 1 year | 2 years … 10 years |
| B, after "po" / "after" | roku (no numeral: "po roku") | 2 latach, 3 latach, 4 latach | 5 latach … 10 latach | 1 year ("after 1 year") | 2 years … 10 years |

Polish form B has two cases only: "roku" for 1 and "{n} latach" for every other number. "po 1 roku" is never printed. English uses the same words in both forms and always prints the numeral.

| Text | Form | Polish, 1 year | Polish, 3 years | Polish, 5 years | English, 1 year | English, 5 years |
|---|---|---|---|---|---|---|
| Options of "Jak długo zatrzymasz auto" / "How long you will keep the car" | A | 1 rok | 3 lata | 5 lat | 1 year | 5 years |
| Assumptions summary | A | 15 000 km rocznie, 1 rok, OC + AC, kierowca 35–44 lata | 15 000 km rocznie, 3 lata, … | 15 000 km rocznie, 5 lat, … | 15,000 km a year, 1 year, OC + AC, driver aged 35–44 | 15,000 km a year, 5 years, … |
| Home, line under "Najniższy całkowity koszt" (the same after "Rocznie," / "Per year,") | A | Miesięcznie, przy 15 000 km rocznie przez 1 rok. | … przez 3 lata. | … przez 5 lat. | Per month, at 15,000 km a year over 1 year. | … over 5 years. |
| Car page, line under the total | A | miesięcznie, licząc 1 rok posiadania | miesięcznie, licząc 3 lata posiadania | miesięcznie, licząc 5 lat posiadania | per month, over 1 year of ownership | per month, over 5 years of ownership |
| Car page, residual value sentence | B | Po roku auto będzie warte ≈ {kwota} ({p}% ceny). | Po 3 latach auto będzie warte … | Po 5 latach auto będzie warte … | After 1 year the car will be worth ≈ {amount} ({p}% of the price). | After 5 years the car will be worth … |
| Comparison, residual value row | B | Wartość po roku | Wartość po 3 latach | Wartość po 5 latach | Value after 1 year | Value after 5 years |

No other text depends on the ownership period.

### 9.11 Document titles

Pattern: what the page is about, then " | WheelWise"; the home page starts with the name instead. The title of the 404 page repeats its h1. A page that shows an inline error (home, rankings, car, comparison) keeps its own title.

| Page | Polish | English |
|---|---|---|
| Home | WheelWise: ile naprawdę kosztuje nowe auto? | WheelWise: what does a new car really cost? |
| Rankings | Rankingi nowych aut: ceny i koszty posiadania \| WheelWise | New car rankings: prices and cost of ownership \| WheelWise |
| Car details | {nazwa}: koszt posiadania \| WheelWise | {name}: cost of ownership \| WheelWise |
| Comparison | Porównanie aut: koszty obok siebie \| WheelWise | Car comparison: costs side by side \| WheelWise |
| Methodology | Jak liczymy: dane, model kosztów i źródła \| WheelWise | How we calculate: data, cost model and sources \| WheelWise |
| Not found | Nie ma takiej strony \| WheelWise | This page does not exist \| WheelWise |
| Error | Nie udało się wczytać strony \| WheelWise | This page could not be loaded \| WheelWise |

Description of the car page: "{nazwa}: cena orientacyjna {cena}. Miesięczny i roczny koszt posiadania, utrata wartości, paliwo, ubezpieczenie, serwis oraz zarobki, przy których auto mieści się w budżecie." / "{name}: indicative price {price}. Monthly and yearly cost of ownership, depreciation, fuel, insurance, servicing and the income that keeps the car within budget."

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
- One authored moment: on the car page the large cost strip grows from the left once (`--animate-strip-grow`). Nothing else animates on load; there are no scroll-triggered effects. The car photo appears as it decodes, without a fade.
- Sheets slide in from the bottom (below 768 px) or from the right (`--duration-slow`, `--ease-out-expo`) with a fading backdrop, and slide out the same way (`@starting-style` and `transition-behavior: allow-discrete`, no JavaScript). A browser without these two features opens and closes the sheet at once, with no transition (section 8, older browsers).
- Loading: skeletons that keep the final layout's sizes, so nothing shifts when data arrives; buttons show a spinner and `aria-busy`.
- Changing an assumption, filter, metric or period updates results in place; the count lines announce the change.
- Changing the order (T46) reorders the list in place, with no animation; filters, metric, period and assumptions are kept and the list goes back to its first 10 rows. Clearing filters from the panel is immediate and needs no confirmation (each filter is one click to set again, and every other choice is kept).
- Adding a car to the comparison: the toggle changes to "W porównaniu", the bar appears or updates its count. With three cars the remaining toggles show the disabled look and the bar's hint line reads "Komplet. Usuń auto, aby dodać inne."
- Trying to add a fourth car (activating a disabled toggle): nothing is added; the bar's hint line changes to the limit message "Porównanie mieści 3 auta. Usuń jedno, aby dodać kolejne." with an amber alert icon and is announced. It stays until the selection changes or the page is left; no timer.
- Comparison bar: pressing the count opens the list of selected cars above the bar (no animation, chevron turns in `--duration-fast`); Escape, a second press, or focus leaving the bar closes it. The open list lies over the page: the room kept under the footer is that of the closed bar in both states (section 3.1), so opening or closing moves nothing and a click or tap outside the open bar lands on what was under the pointer. Each car has a remove button; "Wyczyść" empties the selection. Focus then moves as section 8 says (to the neighbouring remove button, or to the main content when the bar empties).
- Removing a car or clearing the comparison is immediate and needs no confirmation: it is undone with one click on the toggle.
- Search: the list opens on focus when the field has text; see `SearchCombobox` in section 5.2 for keys.

## 12. Implementation notes

- Use the components as they are; pass translated, formatted strings. Do not restyle: token values, the focus ring, the order and colours of cost categories (`COST_ORDER`, `COST_FILL`), the "≈" marker, the wording "cena orientacyjna" and "niezalecane", control heights.
- Colours, sizes, radii and shadows come only from the tokens in `globals.css`; no hex values in components. `src/app/icon.svg` and `src/app/apple-icon.png` repeat five token values as literals because an icon file cannot read CSS variables: `#0e4553` (brand-strong, tile), `#ffffff` (on-brand, ring), `#4d9cff` (logo-blue, bar 1), `#33d17a` (logo-green, bar 2) and `#ff7a1a` (logo-orange, bar 3). The PNG is rendered from the same mark geometry as `LOGO_RING` / `LOGO_BARS`; if the mark or these tokens ever change, update `icon.svg` and re-render the PNG at 180 x 180.
- Logo: use `<Logo />` (or `<Logo tone="brand" />` on a light surface) as it is. Do not set its size or colours from outside (the bar colours belong to the logo; never recolour them per page), do not replace it with text or a raster image, and do not edit `logo-paths.ts` by hand. The master PNG lives in `design/brand/` and is not served; nothing under `src/` may import it.
- Fonts: put `fontVariables` from `src/components/ui/fonts.ts` on `<html>` (done in `src/app/[locale]/layout.tsx`).
- Mock data: `src/mocks/cars.ts` (cars, costs, income ranges, counts), `src/mocks/copy.ts` and `src/mocks/methodology.ts` (texts), `src/mocks/types.ts` (local copies of the domain types; replace with imports from `@/lib/domain/types` and `@/lib/costs`, the shapes and units are the same). The mock cars are real catalogue rows, with names and slugs written by the catalogue rules (cleaned names; slug make-model[-body]-fuel-gearbox-<KM>km); two rows are invented with a 103-character name for the long-name previews and are marked `mockStressSlugs`. Move the texts to `messages/pl.json` and `messages/en.json`; the functions in `copy.ts` become ICU plurals and placeholders.
- `src/app/[locale]/design-preview/_lib/view.ts` shows how domain objects map to component props (formatting and picking only): reuse the mapping, replace the mock imports with real data. `powerKind(car)` picks the power label from `fuelType`; `carMeta(car, locale)` builds the attribute line that must accompany every name.
- `CostBreakdown.residualValuePct` is a percentage from 0 to 100, in the mocks as in the cost engine. `formatPercent` takes a share from 0 to 1, so the car page calls `formatPercent(costs.residualValuePct / 100, locale)`; cost shares are already fractions and are passed as they are.
- Residual value: it belongs to one ownership period. The real pages take it from the cost breakdown calculated for the period the user chose (`residualValuePln`, `residualValuePct`) and print that same period in the label ("Wartość po 5 latach"), with `ownershipText(years, locale, "after")` or its equivalent in the messages; the two forms of the period and every text that uses them are in section 9.10. The previews pass `MOCK_OWNERSHIP_YEARS` (5), the only period the mock costs exist for; do not copy that constant.
- `InfoNote`: to change its width pass one max-width class in `className` (`max-w-md` on the car page); do not wrap it and do not add a second max-width.
- `CarPhoto`: pass `getModelImage(car)` as `photo` (null when the model has none), `carName` = make + variant, and the seven `car.photo.*` texts as `labels`. The templates keep their placeholders: read them with `t.raw("car.photo.credit")` and so on (the component fills `{name}`, `{author}`, `{license}`, `{source}`; it is a client component, so the labels are strings, not functions). `CarPhotoData` is exported from `CarPhoto.tsx`; the data module may import it or declare the same shape. Place it with the classes of section 6.3 (copy `CarScreen.tsx`); never give the frame a fixed height, another crop rule or a placeholder. Sample photos: `src/mocks/photos.ts` (real Commons files with their real authors and licences; `mockPhotoFor(car)` is keyed like `data/model-images.json`; `mockPhotoBroken` points at a missing file for the failure preview).
- Car names: always `<CarName>` inside an element with `nameWrapClass`; never `truncate` a name outside the closed comparison bar and the key header of the narrow comparison.
- Compare toggles in lists get `describedBy={COMPARE_BAR_HINT_ID}`; a lone toggle gets `showHint`. The fixed bar carries that id by default; a page has one fixed bar. Give a static bar a `hintId` only when something has to point to it. On an attempt to add a fourth car set `notice` on `CompareBar` and keep it until the selection changes.
- `CompareBar` handles focus after `onRemove` and `onClear` itself, also when the selection changes a moment later (for example after it has been saved); `onRemove` and `onClear` only have to change the selection. Keep `id="main"` and `tabIndex={-1}` on `<main>` (`SiteShell`): the bar sends focus there when it empties.
- The comparison bar in the previews (`_components/CompareBarDemo.tsx`) keeps a selection of its own so that removing and clearing can be tried; it shows the shape of the wiring (`cars`, `onRemove`, `onClear`), not where the selection is stored.
- Fuel-consumption ranking: render the default `InfoNote`, or the electric variant when "electric" is the only selected powertrain; hide the month / year switch for `price` and `fuelConsumption`.
- Components with state are client components (`SearchCombobox`, `Sheet`, `SheetDisclosure`); the rest work in Server Components when used uncontrolled. Controlled use needs the handlers listed in section 5.
- `SearchCombobox`: supply `options` for the current `query` (at most 8 are shown) and `statusText` for the live region.
- `CompareBar` is a client component: render it through `SiteShell`'s `compareBar` slot. It may stay mounted while no car is selected (it renders nothing then and still moves focus to `<main>` when the last car is removed); in that case `<html>` needs the resting class `[--bar-height:0px]`, as in the root layout, so the footer keeps no room. `--bar-height` belongs to the bar alone (section 3.1): the component that hosts it never sets, restores or removes the property and needs no effect for it, whatever the state of the bar (closed, open, emptied, back with its list open). Do not remove `data-compare-bar` and do not query the bar's hidden closed copy (it has no ids or names; `aria-expanded`, `aria-controls`, the hint id and `role="status"` exist once, on the visible bar): the focus rule in `globals.css` and the measurement depend on them.
- Rankings order and clear (T46): render `SortDirectionSwitch` last in the title-row group, `value` from `dir`, `onChange` writing the URL (only `desc` is written); keep it mounted across the update. Pass the title with the order (`rankings.listLabel`) as the `RankingList` label. Sidebar: replace the bare h2 with `<FiltersHeading title action={<ClearFiltersButton …/>} />`; sheet: pass the same button as `headerAction` of the filters `SheetDisclosure`. `active` = at least one of the eight filter parameters is set (the badge count > 0). After `onClear` set `status` to the "cleared" text and reset it to "" on the next filter change; do not move focus away from this button. Below 640 px: the group gets `w-full sm:w-auto`, the "Filtry" button `max-sm:grow`, the period switch `fullWidth="narrow"` and `max-sm:grow` (copy `RankingsScreen.tsx`). New texts are in `src/mocks/copy.ts` (`filters.cleared`, `rankings.order`, `rankings.listLabel`) and go to `messages/*.json`.
- Every design-preview page calls `assertDesignPreview()` and returns 404 unless `NEXT_PUBLIC_DESIGN_PREVIEW === "1"` at build time.
- Dependencies added by the design: none.

## 13. Screenshots (`design/screens/`)

File name: `<screen>-<width>-<locale>.png`. Captured from a production build with Playwright (Chromium, headless), device scale factor 1, so every file is exactly as wide as its name says; reduced motion on. Viewport 375 x 812 and 1280 x 900 (320 x 900 and 768 x 900 for the car pages). The car pages and `components-*` were captured after the car photo was added and show the cleaned names; the other files predate the cleaned names. The photos are the real 500 px Commons thumbnails.

- **Full-page captures** (whole document height): every file not listed as a viewport capture. The viewport is grown to the height of the document before the capture, so the fixed comparison bar sits at the bottom edge of the image, over the room the footer keeps free for it, as it does on a real screen scrolled to the end.
- **Viewport captures** (exactly 375 x 812 or 1280 x 900), used where a layer covers the page: `rankings-filters-open-*`, `rankings-assumptions-open-*`, `rankings-full-*`, `compare-bar-open-*`.
- **T46 captures** (`rankings-sort-*`, `rankings-clear-*`): 320 x 812 and 1280 x 900, Polish, production build of the working tree, reduced motion. The preview pages are now rendered inside the site's own layout, which adds a second header and footer around the preview shell; those two and the scrollbar were hidden with injected CSS for the captures, so the layout is exactly 320 / 1280 px wide.

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
| Rankings, order switch on "Od najniższej" (viewport, top of the page) (T46) | `rankings-sort-asc-320-pl`, `rankings-sort-asc-1280-pl` |
| Rankings, order "Od najwyższej", rank 1 = highest (full page) (T46) | `rankings-sort-desc-320-pl`, `rankings-sort-desc-1280-pl` |
| Rankings, clear button in the sidebar heading: enabled / disabled with no filter / disabled and keyboard-focused (viewport) (T46) | `rankings-clear-1280-pl`, `rankings-clear-none-1280-pl`, `rankings-clear-none-focus-1280-pl` |
| Rankings at 320 px with no filter on: no badge, controls on two rows (viewport) (T46) | `rankings-clear-none-320-pl` |
| Rankings, filters sheet with the clear button in its header, enabled / disabled (viewport) (T46) | `rankings-clear-sheet-320-pl`, `rankings-clear-sheet-none-320-pl` |
| Car details, petrol, with the model photo | `car-320-pl`, `car-375-pl`, `car-768-pl`, `car-1280-pl`, `car-375-en`, `car-1280-en` |
| Car details, no photo of the model | `car-no-photo-320-pl`, `car-no-photo-768-pl`, `car-no-photo-1280-pl`, `car-no-photo-1280-en` |
| Car details, photo fails to load (identical to no photo) | `car-photo-error-375-pl`, `car-photo-error-1280-pl` |
| Car details, electric | `car-electric-375-pl`, `car-electric-1280-pl` |
| Car details, hybrid, 103-character name, comparison full | `car-long-name-320-pl`, `car-long-name-375-pl`, `car-long-name-1280-pl` |
| Comparison, 3 cars | `compare-375-pl`, `compare-1280-pl`, `compare-375-en` |
| Comparison, 3 cars with the 103-character name | `compare-long-names-375-pl`, `compare-long-names-1280-pl` |
| Comparison, 2 cars sharing a name | `compare-2-cars-375-pl`, `compare-2-cars-1280-pl` |
| Comparison bar with its list open (viewport) | `compare-bar-open-375-pl`, `compare-bar-open-1280-pl` |
| Comparison, empty (0 cars, 1 car) | `compare-empty-375-pl`, `compare-empty-1280-pl`, `compare-1-car-375-pl` |
| Comparison, loading | `compare-loading-375-pl`, `compare-loading-1280-pl` |
| Methodology | `methodology-375-pl`, `methodology-1280-pl` |
| Not found | `not-found-375-pl`, `not-found-1280-pl` |
| Logo (T41): header element at 320 / 768 / 1280 px, footer element at 375 / 1280 px, master PNG (top) against the SVG (bottom) on `brand-strong` at 128 px height, site icons (16, 32, 64 px favicon and the 180 px Apple icon, at 2x), `tone="brand"` rendered on `surface` and `ground` at 64 px height (no page uses it yet). All with the coloured bars (blue, green, orange). | `logo-header-320`, `logo-header-768`, `logo-header-1280`, `logo-footer-375`, `logo-footer-1280`, `logo-compare`, `logo-icons`, `logo-tone-brand` |
| Error | `error-375-pl`, `error-1280-pl` |
| Components and states | `components-375-pl`, `components-1280-pl` |
