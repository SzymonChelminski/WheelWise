import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  BodyType,
  BrandTier,
  FuelType,
  MarketPrice,
  Segment,
  Transmission,
  ValueRetention,
} from '@/lib/domain/types';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const cars = pgTable('cars', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  variant: text('variant').notNull(),
  bodyType: text('body_type').$type<BodyType>().notNull(),
  segment: text('segment').$type<Segment>().notNull(),
  fuelType: text('fuel_type').$type<FuelType>().notNull(),
  transmission: text('transmission').$type<Transmission>().notNull(),
  powerKw: integer('power_kw').notNull(),
  engineCc: integer('engine_cc'),
  brandTier: text('brand_tier').$type<BrandTier>().notNull(),
  valueRetention: text('value_retention').$type<ValueRetention>().notNull(),
  priceEur: integer('price_eur').notNull(),
  listPricePln: integer('list_price_pln').notNull(),
  priceObservedAt: date('price_observed_at', { mode: 'string' }).notNull(),
  priceSourceUrl: text('price_source_url').notNull(),
  fuelL100: numeric('fuel_l100'),
  electricKwh100: numeric('electric_kwh100'),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const marketPrices = pgTable('market_prices', {
  key: text('key').$type<MarketPrice['key']>().primaryKey(),
  pricePln: numeric('price_pln').notNull(),
  observedAt: date('observed_at', { mode: 'string' }).notNull(),
  source: text('source').notNull(),
  sourceUrl: text('source_url').notNull(),
  fetchedAt: timestamptz('fetched_at').notNull().defaultNow(),
});

export const refreshRuns = pgTable('refresh_runs', {
  id: serial('id').primaryKey(),
  job: text('job').notNull(),
  startedAt: timestamptz('started_at').notNull().defaultNow(),
  finishedAt: timestamptz('finished_at'),
  // A run that never reaches finishRefreshRun stays 'failed'.
  status: text('status').$type<'ok' | 'partial' | 'failed'>().notNull().default('failed'),
  summary: jsonb('summary'),
});
