# WheelWise

WheelWise is a website for drivers in Poland who want to know what a new car costs to own, not only to buy. It ranks new cars by purchase price and by each running cost, compares two or three cars side by side, and shows the net income that keeps a car within a budget. All amounts are in PLN.

Cost figures are estimates. Car prices are indicative: they are French list prices converted to PLN. The site is not a sales offer and not financial advice. The in-app methodology page (`/en/methodology`, `/pl/methodology`) explains how every number is made.

The interface is in Polish and English. There are no accounts and no login. Your settings stay in your browser.

## Features

- Nine rankings: purchase price, total cost, depreciation, maintenance, servicing, parts and wear, fuel consumption, fuel cost and insurance.
- Filters by make, body type, powertrain, gearbox, segment and price range, and a search by make or model.
- Your own assumptions: yearly mileage, ownership period, and insurance (estimate from driver age and cover, or your own premium).
- Costs per month or per year.
- A car page with an illustrative photo of the model, the cost breakdown, the value of the car after the ownership period, and the cost per kilometer.
- An earnings scale with four levels, from "up to 15% of income" to "over 25%". The last level is "niezalecane" ("not recommended").
- A comparison of two or three cars.
- Data refreshed once a day from public sources.

## Tech stack

| Part | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Languages | next-intl 4 (`pl` and `en`) |
| Database | Neon Postgres in production, in-memory PGlite 0.5 in local mode, Drizzle ORM 0.45 |
| Validation | Zod 4 |
| Data import | ExcelJS 4 (Oil Bulletin XLSX), `fetch` for the JSON sources |
| Tests | Vitest 5, Playwright 1, `@axe-core/playwright` 4 |
| Hosting | Vercel (Hobby plan) with one Cron Job |
| Runtime | Node.js 22 or newer |

## Quick start

You need Node.js 22 or newer and npm. You need no account, no credentials and no environment variable. Without `DATABASE_URL` the app runs in local mode: it loads a catalogue of 489 cars and sample market prices from `data/fixtures` into an in-memory database.

1. Clone the repository and open its folder.

   ```bash
   git clone <repository-url>
   cd WheelWise
   ```

2. Install the dependencies.

   ```bash
   npm ci
   ```

3. Start the development server.

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000>. The start page redirects to `/pl` or `/en`, depending on the language of your browser.

To run a production build in local mode, use `npm run build` and then `npm run start`.

### Run the tests

```bash
npm run lint
npm run typecheck
npm run test
```

`npm run test` runs the unit and integration tests. They need no network and no credentials. The end-to-end tests need a browser. Install it once, then run the suite. The suite builds the app and starts it on port 3000.

```bash
npx playwright install chromium
npm run test:e2e
```

If port 3000 is busy, set the environment variable `E2E_PORT` to another port. The suite then starts the app on that port.

```bash
E2E_PORT=3100 npm run test:e2e
```

In PowerShell, use `$env:E2E_PORT = "3100"; npm run test:e2e`.

## Documentation

| Document | English | Polish |
|---|---|---|
| Developer guide: architecture, cost model, catalogue, ingestion, tests | [docs/en/developer-guide.md](docs/en/developer-guide.md) | [docs/pl/developer-guide.md](docs/pl/developer-guide.md) |
| Operations guide: deployment on Vercel and Neon, the daily job, monitoring, maintenance | [docs/en/operations.md](docs/en/operations.md) | [docs/pl/operations.md](docs/pl/operations.md) |
| User guide: how to use the site | [docs/en/user-guide.md](docs/en/user-guide.md) | [docs/pl/user-guide.md](docs/pl/user-guide.md) |

The visual rules of the interface are in [design/DESIGN.md](design/DESIGN.md).

## Data sources and licences

| Source | Used for | Licence |
|---|---|---|
| [ADEME Car Labelling](https://data.ademe.fr/datasets/ademe-car-labelling) (French government agency) | Car catalogue, French list prices, WLTP consumption | Licence Ouverte / Open Licence 2.0 (Etalab) |
| European Commission, Weekly Oil Bulletin | Petrol, diesel and LPG prices in Poland | Reuse with source acknowledgement |
| Narodowy Bank Polski, table A | EUR to PLN mid rate | NBP public data |
| Eurostat, `nrg_pc_204` | Household electricity price in Poland | Reuse with source acknowledgement (CC BY 4.0) |
| [Wikimedia Commons](https://commons.wikimedia.org/) | One photo of each car model, with the author and licence shown under it | CC0, public domain, CC BY or CC BY-SA, checked for each photo |
| Rankomat report | Average third-party insurance premiums by driver age, used to calibrate the insurance estimate | Published report, cited with its source |

Depreciation, insurance, servicing, parts and fees come from a cost model with parameters in `src/config/cost-model.ts`. No open data exists for these values per car model. The methodology page lists the sources with their update frequency and licence.

The photos are found ahead of time by `npm run images:build` and stored in `data/model-images.json`. The running site does not call Wikimedia. The [operations guide](docs/en/operations.md#57-refresh-the-model-photos) describes when and how to run the command.

## Status

The app works in local mode and passes its automated tests. A production deployment on Vercel and Neon has not been verified. The [operations guide](docs/en/operations.md) lists what to check after the first deployment.
