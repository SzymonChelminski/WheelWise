# WheelWise operations guide

This guide is for the person who deploys and runs WheelWise on Vercel with a Neon database. For the code, see the [developer guide](developer-guide.md).

**Status.** The steps below follow the code and the configuration of the repository. They were not run against a real Vercel or Neon account. The production deployment has not been verified. After the first deployment, check the items in the list at the end of section 2.

## 1. Prerequisites

- A Vercel account. The Hobby plan is enough (see section 6 for its restriction).
- A Git repository that Vercel can import, with this project in it.
- A Neon Postgres database, added through the Vercel Marketplace integration.
- Node.js 22 or newer. `package.json` requires `>=22`. In the project settings on Vercel, choose Node.js 22.x or newer.
- On your computer: Node.js 22 or newer and npm, to run the commands in sections 3 to 5.

Links to the vendor documentation:

- [Deploying Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) and [their limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Neon on the Vercel Marketplace](https://vercel.com/marketplace/neon) and [the Neon guide](https://neon.com/docs/guides/vercel-overview)

## 2. First deployment

1. **Create the project.** In Vercel, import the Git repository as a new project. Vercel detects Next.js. The file `vercel.json` sets everything else:

   | Setting | Value |
   |---|---|
   | Region of the functions | `fra1` (Frankfurt) |
   | Build command | `npm run build:vercel` |
   | Cron Job | `GET /api/cron/daily` at `0 3 * * *` (UTC) |

2. **Add the database.** In the project, open the Storage section, add the Neon integration from the Marketplace and connect a new database to the project. Choose a Neon region close to Frankfurt. Free plan is enough.

3. **Check the environment variables.** In the project settings, open Environment Variables and set:

   | Name | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | The Neon connection string | The integration normally creates connection variables. Make sure that `DATABASE_URL` exists for Production. If it does not, add it with the connection string from the Neon console. The build needs it. |
   | `CRON_SECRET` | A long random string | Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to the cron route. Without it, the route answers `401` to every request, also to Vercel. Create a value with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.example` | Only for a custom domain. See below. |

   Vercel applies a changed variable only to new deployments. Redeploy after every change.

4. **Deploy.** The build command `npm run build:vercel` runs three steps:

   1. `npm run db:migrate` applies the SQL migrations in `drizzle/` to the database. Migrations that are applied already are skipped.
   2. `npm run db:bootstrap` loads the fixture catalogue (489 cars) and the fixture market prices, but only into an empty database. It never changes existing data.
   3. `next build` builds the app. The build reads the catalogue from the database, so the database must be reachable from the build.

   If `DATABASE_URL` is missing on Vercel, the build fails with an error that says local mode is disabled on Vercel in production. Every build runs these steps against the `DATABASE_URL` of its environment, a preview build too. If you want pull request builds to stay away from production data, give the Preview environment its own database or branch.

5. **Run the first refresh by hand.** After the first deployment, the site shows the fixture data: sample fuel prices and the catalogue of 2026-09-14 at the fixed rate 4.30 PLN per EUR. The job replaces the fixture market prices on its first run. It replaces the fixture catalogue too, unless the dataset has the same date and the live rate is within 0.5% of 4.30. Do not wait for the schedule. Trigger the job as described in section 3 and read the result. A good result has the status `ok` or `partial`. The stored summary of the run (section 4) shows `"revalidated": true`. Then open the site and check that the footer shows the dates of the fuel prices and of the price list, and the date of the check.

6. **Custom domain (optional).** Add the domain in the project settings. Then set `NEXT_PUBLIC_SITE_URL` to the address with the scheme and without a path, for example `https://your-domain.example`, and redeploy. The rule for the site address is:

   - `NEXT_PUBLIC_SITE_URL`, when it is set. It must be an absolute `http:` or `https:` address without a path, query or hash. A trailing slash is removed. An invalid value fails the build.
   - Otherwise `https://` plus the production domain that Vercel gives to the project (`VERCEL_PROJECT_PRODUCTION_URL`).
   - Otherwise `http://localhost:3000`.

   The address is used for canonical links, language alternates and the User-Agent of the job. Without a custom domain you do not need to set it.

### Checks after the first deployment

These parts were not verified against Neon and Vercel. Check them once:

- [ ] The build finished and the site opens on `/pl` and `/en`.
- [ ] From your computer, run `DATABASE_URL="<Neon connection string>" npm run db:migrate` twice. Both runs print `migrations applied`.
- [ ] Run `DATABASE_URL="<Neon connection string>" npm run db:bootstrap` twice. The second run prints `bootstrap done: 0 cars loaded, 0 market prices loaded`.
- [ ] The cron route answers `401` without the token and runs the job with it (section 3).
- [ ] The first job run finishes with `ok` or `partial`, and the Oil Bulletin step reads the file (the document address in `src/config/sources.ts` was not tested from the network of Vercel).
- [ ] Lists show cars in a sensible order. The sort order was not tested under the collation of Neon.
- [ ] Vercel starts the Cron Job on its own on the next day. Check the Cron Jobs page of the project and the `refresh_runs` table.

## 3. Cron job

- **Schedule.** `0 3 * * *` in `vercel.json`, in UTC. This is 04:00 in Poland in winter and 05:00 in summer.
- **Precision.** On the Hobby plan a cron job runs once a day at most, and Vercel can start it at any time within the given hour (a deviation of up to 59 minutes). See the [Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) page. Vercel runs Cron Jobs for the production deployment only.
- **What it calls.** `GET /api/cron/daily`. The route answers:

  | Answer | Meaning |
  |---|---|
  | `401` with `{}` | Missing or wrong bearer token, or `CRON_SECRET` is not set. |
  | `200` with JSON | The job finished with the status `ok` or `partial`. |
  | `500` with JSON | The status is `failed` (every step failed), or the job crashed. |

  The route never caches its answer. `maxDuration` is 300 seconds, the limit of the Hobby plan. The job has its own time budget of 240 seconds.

### Start the job by hand

With HTTP and the bearer token:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain.example/api/cron/daily
```

With the command line, against the Neon database (the variable must be set in the shell, see the [developer guide](developer-guide.md#3-local-mode-and-production-mode)):

```bash
DATABASE_URL="<Neon connection string>" npm run refresh
```

A dry run reads all sources and writes nothing, not even a log row:

```bash
npm run refresh -- --dry-run
```

Without `DATABASE_URL` a real run writes to the in-memory database of that process, which is lost at once. Use the dry run in that case.

The command line does not refresh the cache of the running site. The pages then show the new data when their cache entries expire. Use the HTTP call when you want the site to update at once.

### Read the result

The HTTP answer has this shape. The stored `summary` holds the same `results` list and the extra field `revalidated`.

```json
{
  "status": "ok",
  "results": [
    {
      "source": "exchange-rate",
      "ok": true,
      "updated": 1,
      "skipped": 0,
      "errors": [],
      "notes": ["EUR/PLN 4.3775 (2026-10-09)"]
    }
  ]
}
```

There is one entry for each step, in the order `exchange-rate`, `oil-bulletin`, `electricity`, `catalogue`. `updated` counts the values that were written. `skipped` counts the values that were already current, and for the catalogue also the rows that the builder left out. `notes` explain what happened. `errors` lists the problems with an `item` and a `message`. The command line prints the same information as text. The exit code is 1 only for the status `failed`.

On a normal day most steps report `skipped`, because the sources publish at their own pace: fuel prices weekly, the car catalogue about quarterly, electricity every half-year, and the exchange rate on working days.

## 4. Monitoring

Every real run (not a dry run) writes one row to the table `refresh_runs`. Read it in the SQL editor of the Neon console, or with `psql` and the connection string.

| Column | Meaning |
|---|---|
| `id` | Run number. |
| `job` | Always `daily`. |
| `started_at`, `finished_at` | Times. `finished_at` is empty for a run that never ended. |
| `status` | `ok`, `partial` or `failed`. A run that never ends (for example when Vercel stops the function) keeps the default `failed`. |
| `summary` | JSON `{ "results": [...], "revalidated": true|false }`. `revalidated` is true when the run updated data inside the Next.js server and refreshed the cache. |

The last runs:

```sql
select id, status, started_at, finished_at from refresh_runs order by id desc limit 10;
```

The errors of one run:

```sql
select r->>'source' as step, r->'errors' as errors
from refresh_runs, jsonb_array_elements(summary->'results') as r
where id = 42 and jsonb_array_length(r->'errors') > 0;
```

The footer of the site shows the date of the last run that ended with `ok` or `partial`.

### Statuses

- `ok`: every step finished and reported no error.
- `partial`: at least one error was reported, or at least one step failed while another one did not. Data from the other steps is current.
- `failed`: every step failed. Nothing was written.

A step counts as failed only when it has errors and wrote nothing and skipped nothing. A step with errors for some items, but with updates, is reported as `ok` with a list of errors, and the job status is `partial`.

### Typical failures

Stored data stays in place after each of these failures. The site keeps working with the last good values.

| Message in `errors` | Cause | What to do |
|---|---|---|
| `Make is not in data/brands.json, so it got the default tier and retention` (the `item` is the dataset spelling of the make) | The dataset has a new make. The job is `partial` every day until you add it. | Add the make (section 5.1). |
| `HTTP 404 from energy.ec.europa.eu/document/download/...` | The Commission published the Oil Bulletin under a new document id. | Update `latestPricesUrl` (section 5.3). |
| `Oil bulletin: no header row with a Euro-super 95 column`, `expected one ... column`, `unit of the ... column`, `no row for poland`, `the prices are not in EUR` | The layout of the Oil Bulletin file changed. | Section 5.3. |
| `... price ... is outside the valid range` or `LPG price ... is not lower than petrol` | A value in the source looks wrong. The job does not store it. | Look at the bulletin. If the value is correct, change the range in `src/config/sources.ts`. If not, wait for the next bulletin. |
| `EUR/PLN rate ... is outside the valid range 3..7` | A wrong value from NBP. | Check the NBP API. Change the range only if the market really moved. |
| `Only ... valid rows downloaded`, `Only ... cars built`, `fewer than 50% of the ... active cars`, `... ADEME rows fail validation` | The ADEME dataset changed or arrived incomplete. The catalogue guards stopped the write. | Look at the dataset and the `notes` of the step. The old catalogue stays. See section 5.2. |
| `ADEME rows collected ... differ from the reported total` or `... "next" link points to a different host` | The API answered in an unexpected way. | Run the dry run again later. If it repeats, check the API. |
| `HTTP 5xx`, `Request to ... failed`, `Time budget exhausted` | A source is down or slow. | Wait for the next day. If it repeats, check the source. |

The `notes` of the catalogue step include `rows skipped by the builder: ...` with a count for each reason. Reasons such as `no-price`, `no-consumption` and `unsupported-energy` are normal. A count for `unknown-energy`, `unknown-body`, `unknown-range` or `unknown-gearbox` means that the dataset has a new value (section 5.2).

If the cron route is unavailable, check the function logs in Vercel. The route logs `Daily job crashed: <message>` when the job throws.

## 5. Routine maintenance

### 5.1 Add a new make to `data/brands.json`

Do this when the job reports `Make is not in data/brands.json`.

1. Take the spelling from the `item` of the error. It is the make as the dataset writes it.
2. Add an entry to `data/brands.json`:

   ```json
   "ZEEKR": { "displayName": "Zeekr", "tier": "mainstream", "retention": "average" }
   ```

   `tier` is `budget`, `mainstream` or `premium`. `retention` is `high`, `average` or `low`. Both values are estimates that set the servicing, parts and depreciation of the make.
3. Run `npm run fixtures:build`, then `npm run test`. Update the tests that quote the old counts.
4. Commit and deploy.
5. The catalogue changes only when the job writes it. If the dataset has the same date and the rate moved by less than 0.5%, the job skips the write. To apply the new entry at once, see "Force a catalogue write" below.

Until you add the make, its cars appear with the tier `mainstream` and the retention `average`.

### 5.2 Add a mapping for a new dataset value

Do this when the `notes` show `unknown-energy`, `unknown-body`, `unknown-range` or `unknown-gearbox` with a growing count.

1. Find the new value in the dataset (the field `Energie`, `Carrosserie`, `Gamme` or `Type_de_boite`).
2. Add it to the matching table in `src/config/catalog.ts`: `ENERGY_TO_FUEL_TYPE`, `BODY_TYPE_MAP`, `SEGMENT_MAP` or `TRANSMISSION_MAP`. Write the key in upper case. If the car class must stay out of the catalogue, add the energy to `UNSUPPORTED_ENERGIES` instead.
3. If the new value also needs a new type in the app, that is a code change. See the [developer guide](developer-guide.md#7-catalogue).
4. Run `npm run test`, commit and deploy. Apply the change as described in "Force a catalogue write".

### 5.3 React to a changed Oil Bulletin

The step reads the file at `OIL_BULLETIN.latestPricesUrl` in `src/config/sources.ts`. The address names a document by id, and the Commission replaces the file behind it every week.

- **New document id.** Open the [Weekly Oil Bulletin page](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en), find the document "Prices with taxes latest prices" and copy its download address. Put it in `latestPricesUrl`, commit and deploy.
- **New layout.** The adapter finds the columns by the header text and the row by the country name. The patterns are in `OIL_BULLETIN` (`headers`, `country`, `unit`, `currencyHeader`). The comment at the top of `src/ingest/sources/oil-bulletin.ts` describes the layout that the adapter expects. Open the file, compare, and adjust the patterns. Run `npm run refresh -- --dry-run` to check the result. The recorded test file is `tests/fixtures/oil-bulletin/latest-prices-with-taxes.xlsx`. Record a new one and update the expected values in the tests.

### 5.4 Refresh the committed snapshot and fixtures

The snapshot `data/fixtures/ademe-snapshot.json` and the fixtures are used for local mode, the first deployment and the tests. The live site does not use them after the first job. Refresh them when you want local mode and the tests to use a newer dataset.

1. Read `dataUpdatedAt` from the metadata address (`ADEME.metadataUrl` in `src/config/sources.ts`).
2. Download all rows from the rows address (`ADEME.rowsUrl`) and follow the `next` links until there are none.
3. Save the file as `{ "dataUpdatedAt": "<value>", "rows": [ ... ] }`. The script validates the shape with `ademeRowSchema`.
4. Run `npm run fixtures:build`. Check the printed counts and the list of unknown makes.
5. Run `npm run test`. Several tests contain literal values that come from the current snapshot (the number of cars, skipped rows, prices of reference cars). Update them after you have checked that the new values are right.
6. Commit the snapshot, `data/fixtures/cars.json` and the tests.

### 5.5 Force a catalogue write

The catalogue step skips the write when every active car has the same dataset date as the dataset reports and the EUR rate moved by less than 0.5%. A change in `data/brands.json` or in the mappings does not change either value. To make the next run write the catalogue, reset the stored price dates. Run this in the Neon SQL editor, then start the job (section 3):

```sql
update cars set price_observed_at = date '1970-01-01';
```

The run then rebuilds the catalogue and writes all cars again with the dataset date. This step changes only the date column, and the job restores it.

### 5.6 Keep Next.js patched

`package.json` pins `next` and `eslint-config-next` to one exact version. To check for a newer patch release of the same line:

```bash
npm outdated next
```

Read the release notes and the security advisories on the [Next.js blog](https://nextjs.org/blog). To update:

1. Install the new version of both packages, for example `npm install next@<version> eslint-config-next@<version> --save-exact`.
2. Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`.
3. Run `npm run test:e2e` (it needs `npx playwright install chromium` once).
4. Commit `package.json` and `package-lock.json`, and deploy.

## 6. Running cost

Every service that the project uses is free:

| Service | Plan | What the project uses |
|---|---|---|
| Vercel | Hobby | Hosting, one daily Cron Job, one function with a 300 second limit. |
| Neon | Free | One Postgres database. The data is about 1 MB. |
| Data sources | Free | ADEME, European Commission, NBP, Eurostat. No key and no account. |

Limits that matter for this project:

- **Cron frequency.** The Hobby plan allows a job once a day. The project needs exactly that. A more frequent schedule needs a paid plan.
- **Function duration.** The cron route declares 300 seconds, the Hobby limit. The job stops starting requests after 240 seconds.
- **Neon Free.** The data fits easily. Check the current limits on the [Neon pricing page](https://neon.com/pricing).
- **Hobby terms.** The Vercel Hobby plan is for personal, non-commercial use. If the site earns money (advertising, paid features, sponsoring), you need a paid plan. Read the [Hobby plan terms](https://vercel.com/docs/plans/hobby) before you monetise the site.

The ADEME dataset has the Licence Ouverte / Open Licence 2.0. It allows free reuse with attribution. The site shows the attribution in the footer and on the methodology page. Keep both.

## 7. Rollback and data safety

- **A failed refresh never deletes data.** Each step validates its input before it writes. On an error the step leaves the stored data as it is. The next run tries again.
- **Market prices** are written only when the source date is newer than the stored one. An old file cannot overwrite a newer price.
- **The catalogue shrinks only through guards.** The step refuses to write fewer than 200 cars, fewer than 1000 valid rows, or fewer than half of the currently active cars. `replaceCatalog` also refuses an empty list.
- **Cars are deactivated, not deleted.** When a new dataset release no longer contains a car, its row stays in the table with `active = false`. Its page answers "not found". If the car returns, the next write reactivates it.
- **The catalogue write is not atomic.** The Neon HTTP driver has no transactions. If a write fails in the middle, the database holds a mix of old and new valid prices. No car is deactivated in that case, because deactivation comes last. The next run writes the catalogue again.
- **Roll back a deployment.** Vercel keeps earlier deployments. In the project, open Deployments and promote an earlier one. The database is not rolled back with the code. The project has one migration so far. It creates the three tables, and `db:migrate` skips migrations that are applied.
- **Restore bad data.** The database keeps no history of catalogue versions. To get back a good catalogue after a bad write, fix the cause and write the catalogue again (section 5.5). Check the [Neon documentation](https://neon.com/docs/guides/vercel-overview) for the restore options of your plan.
