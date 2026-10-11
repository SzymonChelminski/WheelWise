export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'phev' | 'ev';
export type Segment = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type BodyType =
  | 'sedan_hatchback'
  | 'estate'
  | 'suv'
  | 'coupe'
  | 'convertible'
  | 'mpv'
  | 'van';
export type Transmission = 'manual' | 'automatic';
export type BrandTier = 'budget' | 'mainstream' | 'premium';
export type ValueRetention = 'high' | 'average' | 'low';

export interface CarInput {
  slug: string; // unique, lower-case ASCII kebab-case
  make: string; // display name, e.g. "BMW"
  model: string; // dataset model code, e.g. "SANDERO", "218"
  variant: string; // commercial description, e.g. "SANDERO (91ch)", "218i Active Tourer"
  bodyType: BodyType;
  segment: Segment;
  fuelType: FuelType;
  transmission: Transmission;
  powerKw: number;
  engineCc: number | null;
  brandTier: BrandTier;
  valueRetention: ValueRetention;
  priceEur: number; // French list price incl. French VAT, integer
  listPricePln: number; // indicative Polish price, integer, rounded to 100
  priceObservedAt: string; // ISO date of the dataset's last data update
  priceSourceUrl: string; // dataset page
  fuelL100: number | null; // WLTP combined
  electricKwh100: number | null; // WLTP combined
}

export interface Car extends CarInput {
  id: number;
}

export type MarketPriceKey = 'petrol' | 'diesel' | 'lpg' | 'electricity';

export interface MarketPrice {
  key: MarketPriceKey | 'eur_pln';
  pricePln: number;
  observedAt: string;
  source: string;
  sourceUrl: string;
}

export type MarketPrices = Record<MarketPriceKey, MarketPrice>;

export type DriverAgeBand =
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-59'
  | '60-64'
  | '65-69'
  | '70-74'
  | '75+';

export interface Assumptions {
  annualMileageKm: number; // 1000..100000, default 15000
  ownershipYears: number; // integer 1..10, default 5
  insurance:
    | { mode: 'estimate'; driverAgeBand: DriverAgeBand; coverage: 'oc' | 'oc_ac' }
    | { mode: 'custom'; annualPremiumPln: number }; // 0..100000
}

export type Period = 'month' | 'year';
