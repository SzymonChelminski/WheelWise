// Every external URL, validation range and request limit of the refresh job.

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');

export const USER_AGENT = `WheelWise/1.0 (+${siteUrl}/en/methodology)`;

export const HTTP = {
  timeoutMs: 15_000,
  retryDelayMs: 500,
  maxJsonBytes: 1_000_000,
  maxXlsxBytes: 10_000_000,
} as const;

export const NBP = {
  source: 'Narodowy Bank Polski, tabela A',
  currentUrl: 'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json',
  rangeUrl: (startDate: string, endDate: string) =>
    `https://api.nbp.pl/api/exchangerates/rates/a/eur/${startDate}/${endDate}/?format=json`,
  /** The range query covers this many days ending on the requested date. */
  rangeDays: 7,
  eurPlnRange: { min: 3, max: 7 },
} as const;

export const OIL_BULLETIN = {
  source: 'European Commission, Weekly Oil Bulletin',
  pageUrl: 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en',
  // The "Prices with taxes latest prices" document. The address holds a document id,
  // not a date. The Commission replaces the file behind it every week.
  latestPricesUrl:
    'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en',
  country: 'poland',
  currencyHeader: /\bEUR\b/,
  unit: '1000l',
  headers: {
    petrol: /euro-super\s*95/i,
    diesel: /automotive gas oil/i,
    lpg: /lpg motor fuel/i,
  },
  /** Valid price per litre in PLN. */
  pricePlnRange: { min: 2, max: 15 },
} as const;

export const EUROSTAT = {
  source: 'Eurostat, nrg_pc_204',
  url:
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
    '?format=JSON&geo=PL&currency=NAC&tax=I_TAX&nrg_cons=KWH2500-4999&lastTimePeriod=2',
  /** Valid price per kWh in PLN. */
  pricePlnRange: { min: 0.3, max: 5 },
} as const;
