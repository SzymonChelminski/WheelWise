import { catalogueStep } from './sources/ademe-catalogue';
import { electricityStep } from './sources/eurostat-electricity';
import { exchangeRateStep } from './sources/nbp';
import { oilBulletinStep } from './sources/oil-bulletin';
import type { JobStep } from './types';

/** Steps of the daily job in run order. Add new sources here. */
export const dailySteps: JobStep[] = [
  { name: 'exchange-rate', run: exchangeRateStep },
  { name: 'oil-bulletin', run: oilBulletinStep },
  { name: 'electricity', run: electricityStep },
  { name: 'catalogue', run: catalogueStep },
];
