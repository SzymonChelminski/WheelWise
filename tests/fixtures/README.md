# Recorded source responses

Responses of the external data sources, recorded once and served to the tests by a
fake `fetch`. The tests make no network request.

| File | Source | Recorded | Content |
|---|---|---|---|
| `nbp/current-rate.json` | `https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json` | 2026-10-12 | EUR mid rate 4.3775, published 2026-10-09 |
| `nbp/range-2026-09-29_2026-10-05.json` | `.../rates/a/eur/2026-09-29/2026-10-05/?format=json` | 2026-10-12 | Five publication days; the last one is Monday 2026-10-05 (4.3855) |
| `nbp/range-2026-09-28_2026-10-04.json` | `.../rates/a/eur/2026-09-28/2026-10-04/?format=json` | 2026-10-12 | A range ending on a Sunday; the last one is Friday 2026-10-02 (4.3745) |
| `nbp/range-2026-10-05_2026-10-11.json` | `.../rates/a/eur/2026-10-05/2026-10-11/?format=json` | 2026-10-12 | A range ending on a Sunday; the last one is Friday 2026-10-09 (4.3775) |
| `oil-bulletin/latest-prices-with-taxes.xlsx` | European Commission, Weekly Oil Bulletin, "Prices with taxes latest prices" | 2026-10-12 | The official file with its document metadata and cell comments removed; the sheet data (every cell value and type) is unchanged: bulletin of 2026-10-05, EUR per 1000 litres |
| `eurostat/electricity-pl.json` | Eurostat `nrg_pc_204`, Poland, national currency, all taxes, 2500-4999 kWh, last two periods | 2026-10-12 | 2025-S2 and 2026-S1; the `extension` block (descriptive metadata) is removed |
| `ademe/metadata.json` | `https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling` | 2026-10-12 | Reduced to id, title, row count, licence, dates and addresses |
| `ademe/rows-page-1.json`, `ademe/rows-page-2.json` | Rows endpoint of the same dataset | cut from `data/fixtures/ademe-snapshot.json` | The first twelve rows as two pages of six, linked by `next`; empty fields are left out, as the API does |

Larger row sets are cut from `data/fixtures/ademe-snapshot.json` at run time by
`tests/integration/helpers/sources.ts`.

To record a file again, request the address above and store the answer under the same
name. Expected values in the tests are literals worked out from these files, so a new
recording needs new expected values.
