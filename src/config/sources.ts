// Every external URL, validation range and request limit of the refresh job.

import { SITE_URL } from '@/config/site';

export const USER_AGENT = `WheelWise/1.0 (+${SITE_URL}/en/methodology)`;

/** The `source` of the rows loaded from `data/fixtures`. Real data always replaces them. */
export const FIXTURE_SOURCE = 'fixture';

/** A source date may be this far after the current time (time zones, early publication). */
export const FUTURE_DATE_TOLERANCE_MS = 86_400_000;

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

const ademeDatasetApi = 'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling';
const ademeFields = [
  'Marque',
  'Modèle',
  'Description_Commerciale',
  'Energie',
  'Carrosserie',
  'Gamme',
  'Cylindrée',
  'Puissance_maximale',
  'Puissance_nominale_électrique',
  'Type_de_boite',
  'Conso_vitesse_mixte_Min',
  'Conso_vitesse_mixte_Max',
  'Conso_elec_Min',
  'Conso_elec_Max',
  'Prix_véhicule',
] as const;
const ademePageSize = 1000;

export const ADEME = {
  /** The dataset page, stored as the price source of every car. */
  pageUrl: 'https://data.ademe.fr/datasets/ademe-car-labelling',
  metadataUrl: ademeDatasetApi,
  rowsUrl: `${ademeDatasetApi}/lines?${new URLSearchParams({
    size: String(ademePageSize),
    select: ademeFields.join(','),
  })}`,
  /** Every request, including each `next` link, must stay on this host and path. */
  host: 'data.ademe.fr',
  apiPathPrefix: '/data-fair/api/',
  maxPages: 20,
  rowsTimeoutMs: 30_000,
  /** More invalid rows than this share of the download fails the step. */
  maxInvalidRowShare: 0.05,
  minValidRows: 1000,
  minCars: 200,
  /** The new catalogue must hold at least this share of the currently active cars. */
  minCarsShareOfActive: 0.5,
  /** Below this relative difference between the EUR rate used and the rate behind the stored prices, an unchanged dataset is not rewritten. */
  rateChangeTolerance: 0.005,
} as const;
