# WheelWise developer guide

This guide is for a developer who is new to the project. It explains how the app is built, where each rule lives and how to change it. For the first start, see the [README](../../README.md). For deployment and the daily job, see the [operations guide](operations.md).

## 1. Architecture overview

### 1.1 Components

| Component | Location | Job |
|---|---|---|
| Catalogue builder | `src/lib/catalog/` | Pure functions that turn rows of the ADEME dataset into WheelWise cars: value mapping, grouping, price conversion. Uses `data/brands.json`. |
| Database | `src/db/` | Three tables: `cars`, `market_prices`, `refresh_runs`. Neon Postgres in production, in-memory PGlite in local mode. |
| Ingestion | `src/ingest/` | Source adapters and the daily job. A Vercel Cron Job starts it through `GET /api/cron/daily`. The script `scripts/refresh.ts` starts it from the command line. |
| Cost engine | `src/lib/costs/` | Pure functions without I/O. They calculate costs, the earnings scale and the rankings. The server and the browser use the same code. |
| Data access | `src/lib/data/` | Cached read functions that the pages call. |
| Model photos | `scripts/build-model-images.ts`, `data/model-images.json`, `src/lib/catalog/model-images.ts`, `src/components/ui/CarPhoto.tsx` | A script that you run by hand finds one free photo per car model on Wikimedia Commons. The car page reads the result from a committed file. See section 7.6. |
| User interface | `src/app/[locale]/`, `src/components/` | Pages, design system components and feature components. |
| Configuration | `src/config/` | Cost model parameters, catalogue rules, source addresses and limits, site address, car lookup timing. |

### 1.2 Data flow

```
Vercel Cron -> GET /api/cron/daily -> runJob('daily')
   1. exchange-rate : NBP table A, EUR mid rate           -> market_prices (eur_pln)
   2. oil-bulletin  : EC Weekly Oil Bulletin XLSX + NBP   -> market_prices (petrol, diesel, lpg)
   3. electricity   : Eurostat nrg_pc_204                 -> market_prices (electricity)
   4. catalogue     : ADEME API -> buildCatalog           -> cars (replace catalogue)
   -> one row in refresh_runs -> revalidate cache tag "catalog"

page -> src/lib/data (cached) -> cost engine (with the user's assumptions) -> UI
```

On the first deployment, `npm run db:migrate` and `npm run db:bootstrap` load the committed fixtures. The site has data before the first job runs. See section 7.

### 1.3 Rendering and caching

- Next.js runs with `cacheComponents: true` and `partialPrefetching: true` (`next.config.ts`).
- The functions `getCatalog`, `getCar` and `getSearchIndex` in `src/lib/data/` use `'use cache'`, the cache tag `catalog` and the cache life profile `hours`.
- The daily job calls `revalidateTag('catalog', 'max')` after it changed data. This works only inside the Next.js server (the cron route). When you start the job from the command line, the call fails without effect, and the pages show the new data when their cache entries expire.
- `src/proxy.ts` is the Next.js proxy. It answers `400` for an address with broken encoding, applies the next-intl locale routing, and answers `404` for an unknown car address (`/<locale>/cars/<slug>`). See "Unknown car addresses" below.
- The cost engine also runs in the browser. When a user changes an assumption, the car page and the comparison page calculate the new values at once, without a request to the server.

**Unknown car addresses.** The proxy (`src/proxy.ts`) and the timing constants (`src/config/car-lookup.ts`) work like this:

- A slug is unknown without any lookup when it is longer than 200 characters (`MAX_CAR_SLUG_LENGTH`) or does not match `CAR_SLUG_PATTERN`. The pattern allows lower-case letters and digits in groups that are joined by single hyphens.
- Any other slug is checked against a set of the slugs of active cars. Each server instance reads the set with `getActiveCars` and keeps it in memory, so a car address costs no query.
- For an unknown slug, the proxy rewrites the request to `/<locale>/cars`. This path has no page, so the catch-all page answers `404` on the first request. The browser keeps the address that it requested.
- A set is trusted for 5 minutes (`ACTIVE_SLUGS_REFRESH_MS`). After that, the next request starts a new read, and the old set answers while the read runs.
- After a failed read, the old set stays in use, and the next try comes after 30 seconds (`ACTIVE_SLUGS_RETRY_MS`).
- An instance that has no set yet makes a request wait for the first read for at most 5 seconds (`ACTIVE_SLUGS_READ_TIMEOUT_MS`). A slower read is not cancelled. Its result serves the later requests.

Limitation: while an instance has no set, the proxy cannot tell which cars exist. This happens when the first read takes longer than 5 seconds or fails. In this time, an unknown car address with a valid shape passes through and answers `200` instead of `404`. The state ends when a read succeeds. After a failed read, the retry delay of 30 seconds applies, and the requests in between pass through as well. A slug with an invalid shape still gets `404`, because that check needs no set.

### 1.4 URL state

The assumptions, the period, the ranking filters and the compared cars live in the query string of the page. This keeps links shareable. Assumptions and the comparison selection are also copied to `localStorage` (keys `wheelwise.assumptions.v1` and `wheelwise.compare.v1`). A page opened without assumption parameters takes the stored assumptions once.

Query parameters:

| Parameter | Page | Meaning |
|---|---|---|
| `km` | all | Yearly mileage, 1000 to 100000. Default 15000. |
| `years` | all | Ownership period, whole number 1 to 10. Default 5. |
| `age` | all | Driver age band: `18-24`, `25-34`, `35-44`, `45-54`, `55-59`, `60-64`, `65-69`, `70-74`, `75+`. Default `35-44`. |
| `cov` | all | `oc` or `oc_ac`. Default `oc_ac`. |
| `ins` | all | Own yearly premium in PLN, 0 to 100000. When it is present, insurance uses this value and `age` and `cov` are ignored. |
| `period` | all | `month` or `year`. Default `month`. |
| `metric` | `/rankings` | One of the nine ranking metrics. Default `totalCost`. |
| `make`, `segment`, `body`, `fuel`, `gear`, `pmin`, `pmax`, `q` | `/rankings` | Filters. List filters accept repeated or comma-separated values. |
| `limit` | `/rankings` | Number of rows shown, a multiple of 10, at most 1000. Default 10. |
| `cars` | `/compare` | Comma-separated slugs. At most three cars count. |

An invalid value falls back to the default. Values that equal the default are left out of the address.

The mechanism that keeps this state consistent is in `src/lib/state/intended-query.ts`. The "intended query" is the query of the most recently requested navigation on the current path, also while that navigation is still loading. The rules are:

- A control changes the query only through `useQueryWriter`. It applies a function to the intended query and sends the router to the result.
- A link that carries query state is a `LiveLink` (`src/components/features/LiveLink.tsx`) or a `PageLink`. Its address is a function of the intended query. The function is `resolveTarget` in `src/components/features/link-target.ts`, and it takes a plain-data description of the target (`carry`, `metric`, `more` or `clear`).
- Do not write to the URL in any other way: no direct `router.push`, no `history.replaceState`, no `window.location`, no `useSearchParams` for state that a control changes.

Every control and every link that carries query state must follow these rules. Otherwise a link shows a stale address while a navigation is loading, or a control overwrites a change that is still on its way.

Writes use `router.replace`. A write adds a history entry only when a link click to the same path is still loading. This is why the Back button does not step through single filter changes (see section 12).

### 1.5 Response headers

`next.config.ts` sets these headers on every path and turns off `X-Powered-By`:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

There is no script content policy. A policy with `script-src` needs a nonce for each request. A nonce forces dynamic rendering of every page, which conflicts with the caching design. The directives above restrict framing, the document base, form targets and plugins without a nonce.

## 2. Folder structure

```
data/brands.json                     make -> display name, tier, value retention
data/fixtures/ademe-snapshot.json    recorded ADEME rows (3604 rows, dataset of 2026-09-14)
data/fixtures/cars.json              catalogue built from the snapshot (489 cars)
data/fixtures/market-prices.json     sample market prices for local mode and bootstrap
data/model-names.json                exceptions for the case rule of car names (section 7.2)
data/model-images.json               photo of each car model, generated by images:build (section 7.6)
data/model-image-overrides.json      hand-kept choices for images:build (section 7.6)
design/DESIGN.md, design/screens/    design specification and reference screenshots
docs/en/, docs/pl/                   documentation
drizzle/                             SQL migrations generated by drizzle-kit
messages/pl.json, messages/en.json   all interface texts
scripts/                             db-migrate, db-bootstrap, refresh, build-fixture-catalog, build-model-images
src/app/[locale]/                    pages: home, rankings/, cars/[slug]/, compare/, methodology/, not-found, error
src/app/[locale]/design-preview/     static layouts of the design (disabled unless enabled, see section 10)
src/app/api/cron/daily/route.ts      the cron route
src/components/ui/                   design system components (presentational)
src/components/layout/SiteShell.tsx  page frame: header, footer, comparison bar slot
src/components/features/             components with logic: rankings, car, compare, search, assumptions, shell
src/config/                          cost-model.ts, catalog.ts, sources.ts, site.ts, car-lookup.ts
src/db/                              schema, client, migrate, bootstrap, repositories
src/i18n/                            next-intl routing, request configuration, navigation helpers
src/ingest/                          job runner, source adapters, HTTP helpers
src/lib/catalog/                     catalogue builder and the photo lookup (model-images.ts)
src/lib/costs/                       cost engine and earnings scale
src/lib/data/                        cached read functions
src/lib/domain/                      types, Zod schemas, assumptions parsing
src/lib/state/                       URL and browser state
src/mocks/                           sample data used only by the design preview
src/proxy.ts                         locale routing and 404 for unknown cars
tests/unit/, tests/integration/      Vitest tests
tests/e2e/                           Playwright tests
tests/fixtures/                      recorded responses of the external sources
```

## 3. Local mode and production mode

The app picks its database from `DATABASE_URL`.

- **Production mode** (`DATABASE_URL` set): the app uses the Neon driver (`drizzle-orm/neon-http`).
- **Local mode** (`DATABASE_URL` empty or unset): the app creates an in-memory PGlite database in each process. It applies the migrations from `drizzle/` and loads `data/fixtures/cars.json` and `data/fixtures/market-prices.json`. Data changes are lost when the process ends.
- On Vercel in production, local mode is switched off. If `DATABASE_URL` is missing there (`NODE_ENV=production` and `VERCEL=1`), the first database call throws an error that names the missing variable.

Environment variables:

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | In production | Neon connection string. If empty, the app runs in local mode. |
| `CRON_SECRET` | In production | Shared secret. Vercel sends `Authorization: Bearer <CRON_SECRET>` to the cron route. Without it, the route answers `401` to every request. |
| `NEXT_PUBLIC_SITE_URL` | Only for a custom domain | Public address of the site. See the rule below. |
| `NEXT_PUBLIC_DESIGN_PREVIEW` | No | Set to `1` to enable the `/design-preview` routes. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Set by Vercel | Production domain of the project, without scheme. Do not set it yourself. |

`.env.example` lists the variables. Copy it to `.env.local` to set values for `npm run dev`, `npm run build` and `npm run start`. Next.js reads that file. The scripts that run through `tsx` (`db:migrate`, `db:bootstrap`, `refresh`, `fixtures:build`, `images:build`) do not read it. Set the variable in the shell for those:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

```powershell
$env:DATABASE_URL = "postgres://..."; npm run db:migrate
```

### Site address rule

`src/config/site.ts` computes `SITE_URL`. The app uses it for canonical links, language alternates, `metadataBase` and the User-Agent of the refresh job (`WheelWise/1.0 (+<SITE_URL>/en/methodology)`). The order is:

1. `NEXT_PUBLIC_SITE_URL`, when it is set and not empty. It must be an absolute `http:` or `https:` URL without path, query, hash, user name or password. A trailing slash is removed. Any other value makes the build fail, and the error message names the variable and the rule, but not the value.
2. Otherwise `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`. The value must be a bare host name with an optional port. Any other value fails the build.
3. Otherwise `http://localhost:3000`.

On Vercel the address is never `localhost` unless you set it so. An operator sets `NEXT_PUBLIC_SITE_URL` only for a custom domain.

## 4. npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Next.js development server on port 3000. |
| `npm run build` | Builds the app (`next build`). Works in local mode. |
| `npm run build:vercel` | `db:migrate`, then `db:bootstrap`, then `next build`. This is the build command of `vercel.json`. |
| `npm run start` | Starts the built app (`next start`). |
| `npm run lint` | Runs ESLint on the whole project. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm run test` | Runs the Vitest tests in `tests/unit/` and `tests/integration/`. |
| `npm run test:e2e` | Runs the Playwright tests in `tests/e2e/`. The configuration builds and starts the app on port 3000, or on the port in `E2E_PORT` (see section 11). |
| `npm run db:generate` | Runs `drizzle-kit generate`. It writes a new SQL migration to `drizzle/` from the changes in `src/db/schema.ts`. Commit the generated files. |
| `npm run db:migrate` | Applies the migrations in `drizzle/` to the database in `DATABASE_URL`. Applied migrations are skipped. In local mode it prints `local mode: nothing to migrate`. |
| `npm run db:bootstrap` | Loads the fixtures into an empty database (see section 7). In local mode it only checks the fixtures and prints their counts. |
| `npm run fixtures:build` | Rebuilds `data/fixtures/cars.json` from `data/fixtures/ademe-snapshot.json` and `data/brands.json`, with the fixed rate 4.3 PLN per EUR. It prints counts per make, fuel type, body type and skip reason. |
| `npm run images:build` | Finds one photo per car model through the Wikipedia and Wikimedia Commons APIs and writes `data/model-images.json`. It needs network access. See section 7.6. |
| `npm run refresh` | Runs the daily job once. With `-- --dry-run` it writes nothing. See section 8. |

## 5. Domain model and cost model

### 5.1 Domain model

The types are in `src/lib/domain/types.ts`. The Zod schemas that validate them are in `src/lib/domain/schemas.ts`.

- A **car** (`Car`) is one make, model, body type, powertrain, gearbox and power. Its fields include `slug`, `make`, `model`, `variant`, `bodyType`, `segment` (`A` to `F`), `fuelType` (`petrol`, `diesel`, `lpg`, `hybrid`, `phev`, `ev`), `transmission`, `powerKw`, `engineCc`, `brandTier`, `valueRetention`, `priceEur`, `listPricePln`, `priceObservedAt`, `priceSourceUrl`, `fuelL100` and `electricKwh100`. The display name in the interface is the make plus the variant.
- Consumption: `petrol`, `diesel`, `lpg` and `hybrid` cars have `fuelL100` only. `ev` cars have `electricKwh100` only. `phev` cars have both. The schema rejects other combinations.
- **Market prices** have the keys `petrol`, `diesel`, `lpg` (PLN per liter) and `electricity` (PLN per kWh). The key `eur_pln` holds the exchange rate. The cost engine needs the first four. `getMarketPrices` throws when one is missing.
- **Assumptions** are `annualMileageKm`, `ownershipYears` and `insurance`. Insurance is either an estimate (`driverAgeBand` and `coverage`) or a custom `annualPremiumPln`. Limits and defaults are in `src/lib/domain/assumptions.ts`: mileage 1000 to 100000 (default 15000), years 1 to 10 (default 5), premium 0 to 100000, default age band `35-44`, default coverage `oc_ac`.

The cost engine does not validate its input. Validate untrusted values (URL, `localStorage`, form fields) with `parseAssumptions` or `assumptionsSchema` first.

### 5.2 Cost model

`calculateCosts(car, prices, assumptions)` in `src/lib/costs/calculate.ts` returns the cost for the whole ownership period, per year and per month. The values are not rounded. Per year is the total divided by the years. Per month is the total divided by 12 times the years. The cost per kilometer is the total divided by mileage times years.

The total is the sum of six categories. The purchase price is not added: depreciation stands in for it. The model assumes a cash purchase.

| Category | Formula in words | Code |
|---|---|---|
| Depreciation | Purchase price minus the residual value after the ownership period. The residual percentage starts from a table for years 1 to 10 (82, 73, 65, 58, 52, 47, 42, 38, 34, 31 percent). The loss (100 minus the table value) is multiplied by a powertrain factor (petrol 1.0, diesel 1.05, LPG 1.0, hybrid 0.92, plug-in hybrid 1.12, electric 1.35) and by a value retention factor of the make (high 0.9, average 1.0, low 1.12). Then the model adds 0.2 percentage points for each 1000 km that the yearly mileage is above 15000, for each year of ownership. Below 15000 km it subtracts the same amount. The residual percentage stays between 10 and 95. | `src/lib/costs/depreciation.ts` |
| Fuel and energy | Yearly mileage divided by 100, times (liters per 100 km times fuel price, plus kWh per 100 km times electricity price). Petrol, hybrid and plug-in hybrid cars use the petrol price. Diesel and LPG cars use their own price. A missing consumption value counts as 0. The result is multiplied by the years. | `src/lib/costs/fuel.ts` |
| Insurance | With a custom premium: the premium for each year. With an estimate: the third-party (OC) premium of the driver age band, times a power factor (up to 74 kW 0.9, up to 110 kW 1.0, up to 150 kW 1.1, above 150 kW 1.25). With cover `oc_ac`, each year also adds the current value of the car at the start of that year, times 0.025, times an age factor (18 to 24: 2.0, 25 to 34: 1.25, 70 and older: 1.1, other bands 1.0). The OC premium does not change from year to year. | `src/lib/costs/insurance.ts` |
| Servicing | Yearly base by brand tier (budget 900, mainstream 1200, premium 2200 PLN), times 0.6 for electric cars, times the larger of 1 and the yearly mileage divided by 20000. | `src/lib/costs/maintenance.ts` |
| Parts and wear | Yearly mileage times a rate per kilometer by segment (A 0.06, B 0.07, C 0.09, D 0.12, E 0.16, F 0.22 PLN), times a tier factor (budget 0.9, mainstream 1.0, premium 1.4), times 0.9 for electric cars. | `src/lib/costs/maintenance.ts` |
| Fees | Registration of a new car, 160 PLN once, plus periodic inspections: 149 PLN each, 245 PLN for LPG cars. An inspection is due at the end of year 3, 5, 6, 7, 8 and 9. It counts only when its year is less than the ownership period. A 5-year period has one inspection. | `src/lib/costs/fees.ts` |

**Maintenance** (a ranking metric) is servicing plus parts plus fees.

The model also returns the residual value in PLN and in percent, and the cost per kilometer.

### 5.3 Ranking metrics and filters

`rankCars` in `src/lib/costs/ranking.ts` filters the cars, computes the metric and sorts ascending. Ties are sorted by slug. The metrics are `price`, `totalCost`, `depreciation`, `maintenance`, `service`, `parts`, `fuelConsumption`, `fuelCost` and `insurance`. Cost metrics use the monthly value.

The `fuelConsumption` metric ranks liters per 100 km. Plug-in hybrids and electric cars have no place in it. When the only selected powertrain is `ev`, the metric ranks kWh per 100 km instead, and electric cars appear.

The text filter splits the query into words. A car matches when every word is part of "make model variant". The comparison ignores case and accents that decompose under Unicode normalization, but not letters such as `ł`.

### 5.4 Where the parameters live and how to change one

All parameters are in `src/config/cost-model.ts` (the `COST_MODEL` object). Values without a published source are calibrated estimates: the rate of comprehensive cover (AC), the power factors, the servicing and parts rates and the registration fee. The OC premiums follow the Rankomat figures for the first half of 2026. The inspection fee follows the published regulated fee.

To change a parameter:

1. Edit the value in `src/config/cost-model.ts`.
2. If the value also appears in a text, update the text in both `messages/pl.json` and `messages/en.json`. The methodology texts name the registration fee (160 zł), the inspection fees (149 zł and 245 zł) and the income shares. The level notes under `car.levels` name the income shares.
3. Run `npm run test`. The unit tests in `tests/unit/costs/` contain literal expected values worked out from the current parameters. Update the values that the change affects, and check each new value by hand.
4. Update the methodology texts if the logic changes, not only a number.

## 6. Earnings scale

`requiredIncome(monthlyTotalCostPln)` in `src/lib/costs/income.ts` returns four ranges of **net monthly income** (take-home pay). Each range follows from the share of income that the total monthly cost takes:

| Level (`AffordabilityLevel`) | Share of income | Income range |
|---|---|---|
| `comfortable` | up to 15% | from cost / 0.15 |
| `reasonable` | 15% to 20% | from cost / 0.20 to cost / 0.15 |
| `stretch` | 20% to 25% | from cost / 0.25 to cost / 0.20 |
| `not_recommended` | over 25% | up to cost / 0.25 |

Each bound is rounded to 100 PLN. A cost that is not a positive number gives zero bounds. For a total monthly cost of 2000 PLN the bounds are 13300, 10000 and 8000. The yearly view multiplies the monthly bounds by 12 (`earningsLevels` in `src/components/features/car/car-format.ts`).

The shares are `shareComfortable` (0.15), `shareReasonable` (0.2) and `shareStretch` (0.25) in `COST_MODEL.income`. The rounding step is `roundingStepPln` (100).

The thresholds follow Polish guidance: transport should take 15% to 20% of net income at most, and a car that takes more than 20% is usually too expensive. The WheelWise total includes depreciation, so the last threshold is 25%. The methodology page gives the same reason (`methodology.sections.income` in the message files).

The percentages also appear in texts: `car.levels.*.note` and the income list in `methodology.sections.income` in both message files. Change them together with the numbers.

## 7. Catalogue

### 7.1 Source

The catalogue comes from the ADEME "Car Labelling" open dataset, through its JSON API on `data.ademe.fr`. The dataset describes new cars sold in France: price in EUR, WLTP consumption, body, range class, power, gearbox and powertrain. The committed snapshot holds 3604 rows of 37 makes, last updated 2026-09-14. The licence is Licence Ouverte / Open Licence 2.0. Addresses and limits are in `ADEME` in `src/config/sources.ts`.

### 7.2 Builder rules

`buildCatalog(rows, { eurPln, observedAt, sourceUrl, brands })` in `src/lib/catalog/build-catalog.ts` is a pure function. Its output is sorted by slug. The rules and tables are in `src/config/catalog.ts`.

1. **Cleaning.** The builder repairs text with broken encoding (for example `CoupÃ©`), collapses spaces and trims. It matches dataset values after trimming and converting to upper case.
2. **Skipped rows.** The builder checks each row in this order and counts the first reason that applies: `missing-name` (empty make, model or description), `no-price` (empty or 0), `price-out-of-range` (not a whole number, or outside 5000 to 1000000 EUR), `no-power` (see rule 4), `unsupported-energy` (E85 and diesel plug-in hybrid), `unknown-energy`, `unknown-body`, `unknown-range`, `unknown-gearbox`, `no-consumption`.
3. **Value mappings.**

   | Dataset field | Dataset value | WheelWise value |
   |---|---|---|
   | `Energie` | `ESSENCE` | `petrol` |
   | | `GAZOLE`, `GAZ+ELEC HNR` | `diesel` |
   | | `ESS+G.P.L.` | `lpg` |
   | | `ESS+ELEC HNR` (includes mild hybrids) | `hybrid` |
   | | `ELEC+ESSENC HR` | `phev` |
   | | `ELECTRIC` | `ev` |
   | `Carrosserie` | `BERLINE` | `sedan_hatchback` (label "hatchback or saloon") |
   | | `BREAK` | `estate` |
   | | `TS TERRAINS/CHEMINS` | `suv` |
   | | `COUPE` | `coupe` |
   | | `CABRIOLET` | `convertible` |
   | | `MONOSPACE`, `MONOSPACE COMPACT`, `MINISPACE` | `mpv` |
   | | `COMBISPACE`, `MINIBUS` | `van` |
   | `Gamme` | `ECONOMIQUE`, `INFERIEURE`, `MOYENNE INFERIEURE`, `MOYENNE SUPERIEURE`, `SUPERIEURE`, `LUXE` | segment `A`, `B`, `C`, `D`, `E`, `F` |
   | `Type_de_boite` | `MECANIQUE` | `manual` |
   | | `AUTOMATIQUE`, `VARIATION CONTINUE`, `VARIATION ELECTRIQUE` | `automatic` |

4. **Power.** For non-electric cars the power is `Puissance_maximale`, valid from 20 to 1200 kW. The dataset has no maximum power for electric cars. Their power is the highest of: `Puissance_maximale`, the horsepower in the description converted to kW (times 0.7355), the kW figure in the description, and the rated electric power `Puissance_nominale_électrique`. The valid range for electric cars is 15 to 1200 kW. For most electric cars the result is the rated (continuous) power, which is lower than the peak power of the manufacturer. The interface labels it as such. The power is rounded to whole kW.
5. **Consumption.** The value is the mean of the dataset minimum and maximum (or the single value when one is missing), rounded to one decimal. `Conso_elec_*` is in Wh/km, so the builder divides it by 10 to get kWh per 100 km. Plausible ranges: 2 to 25 l/100 km (0.3 to 25 for plug-in hybrids) and 8 to 40 kWh/100 km. A row outside the range, or without the required value, is skipped as `no-consumption`.
6. **Grouping.** One car is one group of rows with the same make, model, body type, powertrain, gearbox and power. For LPG cars the power is not part of the group key, because the dataset lists a bi-fuel version twice (one row for each fuel) with different power.
7. **Representative version.** The cheapest row of the group represents it. Ties are broken by lower consumption, then by description, then by engine size. For LPG cars, the power and the consumption are the highest values among the rows that have the same description as the representative row. The name and the price belong to the representative version. Versions that differ only in drive, battery size, seats or length become one car.
8. **Price conversion.** `listPricePln = round_to_100(priceEur x eurPln x 1.23 / 1.20)`. The builder replaces the French VAT of 20% with the Polish VAT of 23%. `eurPln` is the NBP table A mid rate. French ecological bonus and malus are not part of the price.
9. **Slug.** The address of the car page. Lower-case ASCII words joined by hyphens: make (display name), model code, body type, powertrain, gearbox and the power in KM (metric horsepower) as `<n>km`. The body type is left out when it is `sedan_hatchback`, which the interface labels "hatchback or saloon". The number is `Math.round(powerKw * 1.35962)`, the same factor that the interface uses to show power. The unit `km` stays in English addresses too. Examples: `renault-clio-diesel-manual-101km`, `dacia-jogger-estate-lpg-manual-101km`. If two cars get the same slug, the cheapest keeps it and the others get `-2`, `-3` and so on. The current fixture catalogue has no such suffix.
10. **Name.** The variant is the commercial description of the representative row, made readable in these steps (`displayVariant`):
    1. Remove the repeated make (display name and dataset spelling) at the start. Add the model name when the description lacks it.
    2. Remove every parenthesised power marker such as `(101ch)`, `(94ch+24Kw)` or `(57Kw)`. The interface shows power separately in KM and hp (`POWER_MARKER_PATTERN`).
    3. Remove the words `Essence`, `Gazole`, `facelift` and gearbox codes (`NAME_NOISE_PATTERN`). A gearbox code is `BV` followed by `MA`, `A`, `M` or `R` and optional digits, for example `BVM6`, `BVA`, `BVR7` or `BVMA5`. Replace `Hybride` with `Hybrid` and `Électrique` with `Electric` (`NAME_WORD_REPLACEMENTS`).
    4. Cut the French equipment text after the model. The name ends before the first whole word from a fixed list (`de`, `avec`, `et`, `pour`, `sans`, `norme`, `freins`, `système`, `moteur` and others, see `NAME_TAIL_START_PATTERN`). When the name is cut, the separators `/ - . , +` at the end are removed. When it is not cut, only a separator that stands apart, with a space before it (as in `V8 - BVA` after the code is removed), is removed. A `+` that is part of a word stays: `AMG E 53 4MATIC+` and `EQA 250+` keep it, `EQA 250 +` becomes `EQA 250`. An unclosed bracket at the end is always removed. When a word from the list is the first word of the name, the builder removes only that word and keeps the rest, because the model follows it: `Nouvelle i10 1.0 BVR 4PL` becomes `i10 1.0 4PL`. The check repeats for the next first word. `Classe` is not in the list, because it is part of Mercedes model names.
    5. Apply the case rule (below). If the result is empty, the name is the model code in normal case.

    The case rule works on each word. The characters `-`, `/` and `.` split a word into parts. A part that is all upper case and longer than 3 letters gets a capital first letter and lower case for the rest (`CLIO` becomes `Clio`). A shorter part stays as it is (`GT`, `RS`, `C-HR`). A word with digits or other characters stays as it is (`ID.3`, `M340i`). `data/model-names.json` lists the exceptions: an upper-case word or part, and the spelling to use. It holds real spellings that the rule gets wrong, for example `RIO` (`Rio`), `T-ROC` (`T-Roc`) and the acronyms `TFSI`, `MHEV` and `PHEV`. To add one, add a key and a value, then run `npm run fixtures:build`.

    Examples: `GIULIA 2.0 T Essence (200ch) AT8` becomes `Giulia 2.0 T AT8`. `Karoq 1.5 TSI 4*2 DSG7 norme AP freins 15'' Ambition Classe A avec alt 140A famA` becomes `Karoq 1.5 TSI 4*2 DSG7`.

    Cars that differ only in fuel, gearbox or power can have the same name. The interface shows body type, powertrain, gearbox and power next to every name, and the slug is unique.
11. **Brand data.** A make that is missing from `data/brands.json` gets the title-cased name from the dataset, the tier `mainstream` and the retention `average`. The builder lists it in `unknownMakes`, and the daily job reports it as an error.

### 7.3 `data/brands.json`

The file maps the dataset make to its display name, brand tier and value retention. The key is the make as the dataset writes it, after trimming (for example `B.M.W.` and `LAMBORGHIN`):

```json
"DACIA": { "displayName": "Dacia", "tier": "budget", "retention": "high" }
```

- `tier` is `budget`, `mainstream` or `premium`. It sets the servicing base, the parts factor and (with `retention`) the depreciation.
- `retention` is `high`, `average` or `low`. It sets the depreciation factor.
- `displayName` is the name that users see.

To change a name, a tier or a retention, edit the entry. To add a make, add a new entry with the exact dataset spelling. The job reports the spelling of an unknown make in its error list. The change reaches the database at the next catalogue write (see section 8.4). Rebuild the fixtures with `npm run fixtures:build` and update the tests that quote the old values. Tier and retention values are calibrated estimates, not measured data.

### 7.4 Configuration, snapshot and fixtures

- `src/config/catalog.ts` holds the value mappings, the valid ranges, the VAT rates, the price rounding, the electric power rules and the defaults for unknown makes. To support a new dataset value, add it to the right table and rebuild the fixtures.
- `data/fixtures/ademe-snapshot.json` is a recorded copy of the dataset. Its shape is `{ "dataUpdatedAt": "<ISO date-time>", "rows": [ ... ] }`, and each row has the fields listed in `ademeRowSchema` (`src/lib/catalog/ademe-schema.ts`). Unknown fields are ignored and empty values are `null`.
- `npm run fixtures:build` reads the snapshot, `data/brands.json` and (through `src/config/catalog.ts`) `data/model-names.json`, builds the catalogue at the fixed rate 4.3 PLN per EUR and writes `data/fixtures/cars.json`. With unchanged inputs the output equals the committed file. Run `git diff` after the command to check.
- Local mode and the first deployment load `data/fixtures/cars.json` and `data/fixtures/market-prices.json`. The fixture market prices have the source `fixture`. Real data always replaces them.

### 7.5 Bootstrap on the first deployment

`npm run db:bootstrap` (`src/db/bootstrap.ts`) loads the two fixture files into the database:

- It loads the cars only when the `cars` table has no rows.
- It loads each market price only when its key is missing.
- It never changes or deletes existing rows, so it is safe to run again.

The command prints `bootstrap done: <n> cars loaded, <m> market prices loaded`. On a second run both numbers are 0.

### 7.6 Model photos

The car page shows one illustrative photo of the model, with the author, the licence and a link to the source under it. The photos come from Wikimedia Commons. A script resolves them ahead of time, and the result is committed. The running site makes no request to Wikipedia or Commons. The browser loads each image from `upload.wikimedia.org`.

**Files.**

| File | Role |
|---|---|
| `scripts/build-model-images.ts` | The script behind `npm run images:build`. |
| `data/model-images.json` | Generated and committed. An object that maps a model key to a photo record, or to `null` when the model has no usable photo. |
| `data/model-image-overrides.json` | Kept by hand. Choices that replace the automatic search (see below). |
| `src/lib/catalog/model-images.ts` | `modelKey(car)` and `getModelImage(car)`. It checks `data/model-images.json` with Zod when the module loads and makes no network call. |
| `src/components/ui/CarPhoto.tsx` | The component. It also exports the type `CarPhotoData`. |
| `src/components/features/car/CarDetails.tsx` | Passes `getModelImage(car)` and the texts `car.photo.*` to `CarPhoto`. |

**Key.** `modelKey(car)` is `toSlug(make) + "/" + toSlug(model)`, for example `renault/clio`. It uses the display name of the make and the model code of the dataset, so all versions of a model share one photo.

**Photo record (`CarPhotoData`).**

| Field | Meaning |
|---|---|
| `sources` | Three thumbnails, widths 500, 960 and 1280, as `https://upload.wikimedia.org/...` addresses. The component uses them as `srcset`. |
| `width`, `height` | Size of the original file in pixels. The component takes the frame proportions from them. |
| `author` | Plain text, at most 120 characters. The Commons author field without HTML, or the name of the uploader when the field is empty. |
| `license`, `licenseUrl` | Short licence name, for example `CC BY-SA 4.0`, and its address (`null` when Commons gives none). |
| `sourceUrl` | The file page on `commons.wikimedia.org`. |

**How the script works.** It reads `data/fixtures/cars.json` (not the database) and `data/model-image-overrides.json`. It handles each model key in turn:

1. If the key has an override, it uses that. `{ "article": "<English Wikipedia title>" }` takes the lead image of that article. `{ "file": "File:<name on Commons>" }` takes that file. `null` means no photo on purpose.
2. Otherwise it searches English Wikipedia for "make model" (five results). It takes the first article whose title contains the make and the model (case, accents and punctuation do not count) and whose short description names a car (automobile, car, vehicle, SUV and similar words). Then it takes the lead image of the article.
3. It asks Commons about the file. The entry becomes `null` when the file is not on Commons, when the licence is not on the allow-list, when the file is marked `NonFree`, when it is an SVG, when its width is below 1280 px, when one of the three thumbnails is missing, or when no author is known.
4. The allow-list is CC0, public domain, CC BY and CC BY-SA. The width limit exists because Wikimedia serves a file that is narrower than the requested width as the original and not as a thumbnail.
5. The thumbnail addresses come from the API answer. The API names the host `thumb.wikimedia.org`, and the script writes the same path with the host `upload.wikimedia.org`.

When all keys are done, the script writes `data/model-images.json`, sorted by key, with a two-space indent and a final line feed. A failure (network error, HTTP error, API error) stops the script with exit code 1 before it writes anything, so the file is never partial. The script follows the Wikimedia rules for automated clients. It sends one request at a time, waits at least 150 ms between requests, sends a User-Agent with the repository address, sets `maxlag=5`, and repeats a request once after a 429 answer, a 5xx answer or a `maxlag` error.

**Output.** Standard output has one tab-separated line per model: key, article, file, licence, and a note with the reason when there is no photo. Progress and warnings go to standard error. A warning appears when an override names a key that no model of the catalogue has. To keep the table in a file:

```bash
npm run images:build --silent > images.tsv
```

The `--silent` option stops npm from writing its own header into the table.

**Overrides.** The automatic search can pick the wrong generation or the wrong model, and it finds nothing for some models. Add an entry to `data/model-image-overrides.json`, run the script again and check the result:

```json
{
  "bmw/118": { "article": "BMW 1 Series (F70)" },
  "alfa-romeo/giulia": { "file": "File:Alfa Romeo Giulia 952 Veloce Banchise White 01.jpg" },
  "some-make/some-model": null
}
```

**On the page.** `CarPhoto` renders nothing when the model has no entry in `data/model-images.json` (a model from a newer catalogue), when the entry is `null`, or when the image fails to load in the browser. The page layout then closes the gap. The component shows the tag "Illustrative photo", because the photo shows the model and not necessarily the version or the generation. It uses a plain `<img>` and not `next/image`, so the images do not use the image quota of the hosting plan. The texts are `car.photo.*` in the message files. The methodology page lists Wikimedia Commons in its table of sources and says that photos are illustrative.

The steps to refresh the photos are in the [operations guide](operations.md#57-refresh-the-model-photos).

## 8. Ingestion

### 8.1 The daily job

`runJob('daily')` in `src/ingest/run-job.ts` runs the steps of `dailySteps` (`src/ingest/jobs.ts`) one after the other in this order: `exchange-rate`, `oil-bulletin`, `electricity`, `catalogue`. A step that throws does not stop the others. The job writes a row to `refresh_runs`, then revalidates the `catalog` cache tag if any step updated data.

Status rules (`computeStatus`):

- `ok`: every step is `ok` and has no errors.
- `failed`: every step is not `ok`.
- `partial`: anything else.

A step is `ok` unless it has errors and neither updated nor skipped anything. A single error in any step makes the job `partial`. The `summary` column of `refresh_runs` holds `{ results, revalidated }`, where `results` is the list of step results with their `notes` and `errors`.

### 8.2 Steps

| Step | Source | What it writes | Validation |
|---|---|---|---|
| `exchange-rate` | NBP API, table A, EUR | `eur_pln` | Rate between 3 and 7. The date may not be more than one day in the future. |
| `oil-bulletin` | European Commission Weekly Oil Bulletin, XLSX "Prices with taxes latest prices" | `petrol`, `diesel`, `lpg` in PLN per liter | The adapter finds columns by header text and the row by the country name `Poland`. The currency header must say EUR and the unit must be `1000 l`. It converts EUR per 1000 liters with the NBP rate of the bulletin date and rounds to four decimals. Valid price: 2 to 15 PLN per liter. LPG must be lower than petrol. |
| `electricity` | Eurostat `nrg_pc_204`, Poland, household band 2500 to 4999 kWh, all taxes, PLN | `electricity` | Valid price: 0.3 to 5 PLN per kWh. The date is the first day of the half-year (S1 is 1 January, S2 is 1 July). |
| `catalogue` | ADEME dataset API | `cars` | See 8.3. |

All addresses and limits are in `src/config/sources.ts`.

### 8.3 Catalogue step and guards

1. It reads the dataset update date from the metadata address.
2. It downloads all rows (1000 per page, at most 20 pages). Every `next` link must stay on `data.ademe.fr` under `/data-fair/api/`. The number of rows must equal the reported total.
3. It validates each row with `ademeRowSchema`. If more than 5% of the rows are invalid, the step fails.
4. It takes the EUR rate from the database. If the stored rate comes from a fixture, it asks NBP for the current rate.
5. It builds the catalogue (section 7.2).
6. Guards: at least 1000 valid rows, at least 200 built cars, and at least 50% of the number of currently active cars. If a guard fails, the step fails and writes nothing.
7. Each make that is missing from `data/brands.json` becomes an error entry. The step still writes the catalogue.
8. It writes the catalogue with `replaceCatalog`.

### 8.4 Change detection

- **Market prices.** `saveIfNewer` (`src/ingest/market-store.ts`) skips a price when the stored observation date is the same or later. A stored row with the source `fixture` is always replaced. The `oil-bulletin` step also skips the NBP request when all three stored fuel prices are real and at least as new as the bulletin.
- **Catalogue.** The step skips the write ("unchanged") when every active car has the dataset update date that the API reports now, and the EUR rate differs from the rate behind the stored prices by less than 0.5%. Because of this rule, a change to `data/brands.json` or to the mappings reaches the database only at the next write, that is, with a new dataset release or a rate move of 0.5% or more. The [operations guide](operations.md) describes how to force a write.
- **Replacing the catalogue.** `replaceCatalog` (`src/db/repositories.ts`) inserts or updates cars by slug in batches of 200 and writes only rows that changed. Cars that are missing from the new catalogue are set to `active = false`, never deleted. A car that returns is reactivated. The function refuses an empty catalogue. It does not run in a transaction, because the Neon HTTP driver has none.

### 8.5 HTTP, time budget and dry run

- Every request sends the User-Agent from `USER_AGENT` and has a timeout of 15 seconds (30 seconds for the ADEME rows). After a network error or an HTTP 5xx answer, the request is tried once more after 500 ms. Any other non-2xx answer fails at once. A JSON answer larger than 1 MB or an XLSX file larger than 10 MB is rejected.
- The job has a budget of 240 seconds. No request starts after the deadline. The cron route sets `maxDuration = 300`, the limit of the Vercel Hobby plan.
- `npm run refresh -- --dry-run` runs all steps against the live sources and writes nothing, not even a `refresh_runs` row. It prints the values that it would write, as notes. The exit code is 1 when the status is `failed`, otherwise 0. An unknown argument prints a usage line.

### 8.6 How to add a source

1. Add the addresses, validation ranges and limits to `src/config/sources.ts`.
2. Write the adapter in `src/ingest/sources/<name>.ts`. It exports a function `(ctx: JobContext) => Promise<SourceResult>`. Use `newResult`, `addError` and `finishResult` from `src/ingest/types.ts`, `fetchJson` or `fetchXlsx` and `parseExternal` from `src/ingest/http.ts`, and `saveIfNewer` for market prices. Validate the input and fail without writing.
3. Add the step to `dailySteps` in `src/ingest/jobs.ts`.
4. If the step writes a new market price key, add the key to `MarketPriceKey` (`src/lib/domain/types.ts`), to the `key` enum in `src/lib/domain/schemas.ts` and, if the cost engine needs it, to `COST_KEYS` in `src/db/repositories.ts` and to `data/fixtures/market-prices.json`.
5. Record a response in `tests/fixtures/` and add integration tests that use the fake `fetch` (see section 11).

## 9. Internationalisation

- Locales: `pl` (default) and `en`, set in `src/i18n/routing.ts`. URLs always have the locale prefix (`/pl/...`, `/en/...`). Path segments are English in both locales.
- The start page `/` redirects with the default next-intl detection: an English browser goes to `/en`, any other to `/pl`. The last choice is kept in the `NEXT_LOCALE` cookie.
- All interface texts are in `messages/pl.json` and `messages/en.json`. `src/i18n/request.ts` loads the file for the locale.
- Use `useTranslations()` in client components and `getTranslations()` in server components. Texts use ICU syntax. Polish plurals need the `few` form.
- **Key parity rule.** Both files must have the same keys. Add or change a key in both files in the same change. No automated test checks this. This command prints the keys that are missing on either side:

  ```bash
  node -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?f(v,p+k+'.'):Array.isArray(v)?[p+k+'['+v.length+']']:[p+k]);const a=f(require('./messages/en.json')),b=f(require('./messages/pl.json'));console.log(a.filter(x=>!b.includes(x)),b.filter(x=>!a.includes(x)))"
  ```

  Two empty lists mean the files match. Lists in the methodology texts must have the same length in both files.
- The anchor ids of the methodology sections differ by locale (`prices` and `ceny`, `power` and `moc`). Each section with an anchor has an `otherId` for the language switch.
- Number, currency and date formats are in `src/lib/format.ts` (`pl-PL` and `en-GB`, a non-breaking space before `zł`).
- Wording that the design fixes ("cena orientacyjna", "niezalecane", the `≈` sign) stays as it is. See section 10.

## 10. Design system

- The specification is `design/DESIGN.md`. It is the source of truth for tokens, components, screens and texts.
- The tokens are in `src/app/globals.css` (block `@theme`). The default Tailwind palette is removed on purpose. The components are in `src/components/ui/`, and the page frame is `src/components/layout/SiteShell.tsx`. The typeface is Barlow (files in `src/components/ui/fonts/`).
- **Rule: use the tokens and components as they are. Do not restyle them.** Colors, sizes, radii and shadows come only from the tokens. Do not add hex values to components. Do not change token values, the focus ring, the order and colors of the cost categories, the `≈` marker, the wording "cena orientacyjna" and "niezalecane", or the control heights. If a screen needs something new, change `design/DESIGN.md` and the components together.
- The components are presentational. Texts arrive as translated, formatted strings. Components with logic are in `src/components/features/`.
- **Accessible name of the compare toggles.** Several cars can have the same name, so the accessible name of a compare toggle adds the attributes that tell them apart. It is `Compare: {name}, [body,] {fuel}, {gearbox}, {power}` in English and `Porównaj: ...` in Polish. After a car is added, the first word changes to `In comparison` (`W porównaniu`). The body type is left out for `sedan_hatchback`. `carNameWithAttributes` in `src/components/features/car/car-view.tsx` builds the part after the colon, and `src/components/ui/CompareToggle.tsx` sets the `aria-label`. The ranking rows and the car page pass this text to `CompareToggleButton`.
- **Focus after a change of page.** When the page changes in the browser and the focus is lost, `RouteFocus` (`src/components/features/shell/RouteFocus.tsx`) moves keyboard focus to the main heading (`h1`) of the new page, or to `main` when there is no heading. The next Tab then starts at the page content.
- **Design preview.** Static layouts of every screen and state are under `src/app/[locale]/design-preview/`. They use the sample data in `src/mocks/`. They are off by default and answer `404`. To see them, set `NEXT_PUBLIC_DESIGN_PREVIEW=1` before you start the server or build, then open `/pl/design-preview` or `/en/design-preview`. Reference screenshots are in `design/screens/`.

## 11. Testing

| Level | Tool | Location | Command |
|---|---|---|---|
| Unit | Vitest | `tests/unit/` | `npm run test` |
| Integration | Vitest, in-memory PGlite, recorded fixtures | `tests/integration/`, `tests/fixtures/` | `npm run test` |
| End-to-end | Playwright | `tests/e2e/` | `npm run test:e2e` |
| Static | ESLint, TypeScript | whole project | `npm run lint`, `npm run typecheck` |

- Unit tests cover the cost engine, the earnings scale, the ranking, the assumptions parsing, the Zod schemas and the catalogue builder. They contain literal expected values, so a change to a parameter needs a change to the tests.
- Integration tests cover the repositories, the bootstrap, every source adapter, the job runner and the authorization of the cron route. They make no network request. A fake `fetch` (`tests/integration/helpers/fake-fetch.ts`) answers with the recorded files.
- End-to-end tests use two Playwright projects: `desktop` (Chromium, 1280 x 800) and `mobile` (Pixel 7). `playwright.config.ts` starts the app with `npm run build && npm run start -- --port <port>` and waits for that port, for up to 300 seconds. It reuses a server that already runs on the port, except when the `CI` variable is set. Run `npx playwright install chromium` once.
- **Port of the test server.** The port is the value of the environment variable `E2E_PORT`. The default is `3000`. The tests open `http://localhost:<port>`. Set `E2E_PORT` when port 3000 is busy, for example with a development server. The value must be a port number, because the configuration converts it with `Number()`.

  ```bash
  E2E_PORT=3100 npm run test:e2e
  ```

  ```powershell
  $env:E2E_PORT = "3100"; npm run test:e2e
  ```

- The end-to-end tests run in local mode, so the data is the same on every run. The `@axe-core/playwright` package is installed for accessibility checks.
- **Recorded fixtures.** The responses of NBP, the Oil Bulletin, Eurostat and ADEME are in `tests/fixtures/`. [tests/fixtures/README.md](../../tests/fixtures/README.md) lists the files, the date of each recording and the address. To record a file again, request the address and store the answer under the same name. The expected values in the tests are literals worked out from these files, so a new recording needs new expected values. Larger ADEME row sets are cut from `data/fixtures/ademe-snapshot.json` when the tests run.
- When you change the snapshot or `data/brands.json`, run `npm run fixtures:build` and then `npm run test`. Several tests quote the number of cars (489) and the skipped rows.

## 12. Known limitations

Data and model:

- Prices are French list prices converted to PLN. A price at a Polish dealer can differ by several percent or more. The model range is the French one: 37 makes, some sold in Poland are missing, some French-only versions are present, E85 and diesel plug-in hybrid versions are left out.
- The dataset is updated about every quarter. The price date is shown with every price.
- Depreciation, insurance, servicing, parts and fees are model estimates. Consumption is the WLTP figure, which is lower than real use, especially for plug-in hybrids.
- Electric cars show the rated (continuous) power for most models. Hybrid cars show the power of the combustion engine only.
- Car names are the source descriptions with the power marker and the French words removed and with the model names in normal case (section 7.2). The rule is mechanical, so a few names can still hold a French or technical word that the rule does not know. Many names are shared by two or more cars, so the interface always shows body type, powertrain, gearbox and power next to the name.
- Car addresses changed when the slug rule changed (section 7.2). Addresses in the old format answer `404` and are not redirected. The comparison bar silently removes cars from a stored comparison when their address is not in the catalogue.
- Photos are illustrative. A photo can show another version or generation of the model than the page. The script chooses by article title and short description, so a person must check the result (section 7.6). A new model has no photo until the script runs again.
- The model assumes a cash purchase. It excludes loans, leasing, parking, tolls, fines, washing and tyre storage.
- A change to `data/brands.json` or to the mappings reaches the database only at the next catalogue write (section 8.4).
- `replaceCatalog` is not atomic. If a write fails in the middle, the database holds a mix of old and new valid prices. No car is deactivated in that case, and the next daily run writes the catalogue again.
- The Oil Bulletin file is addressed by a document id in `src/config/sources.ts`. If the Commission publishes under a new id, the step fails without writing, and the address needs a manual update.

Behavior in the browser:

- Lists, comparison and links that carry the query need JavaScript. Without it, the pages show the loading shell. The not-found page is blank.
- The browser Back button does not step through single filter changes.
- Stored assumptions appear a moment after the first paint, on a page opened without assumption parameters.
- A car that the daily refresh adds can answer "not found" for up to about 5 minutes on a server instance that already runs, because the instance reads its slug list every 5 minutes (`ACTIVE_SLUGS_REFRESH_MS`).
- While a server instance has no slug list yet, an unknown car address with a valid shape answers `200` instead of `404`. This happens when the first read takes longer than 5 seconds (`ACTIVE_SLUGS_READ_TIMEOUT_MS`) or fails. It ends when a read succeeds. After a failed read, the next try comes after 30 seconds (`ACTIVE_SLUGS_RETRY_MS`). See section 1.3.
- A make that is missing from `data/brands.json` keeps the daily job in status `partial` until you add it.
- Older browsers: the slide-in animation of the filter and assumption panels needs `@starting-style`, and the panels still work without it. The layout uses `:has()` and has a fallback for browsers without it (Firefox before version 121).

Not verified:

- Production (Vercel and Neon): the Cron call with the secret, the job against Neon, migrations against Neon, `npm run build:vercel`, and the behavior of the sources from the network of Vercel.
- Real phones, Safari, Firefox and screen readers.
