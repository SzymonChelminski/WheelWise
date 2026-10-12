/*
 * Local copies of the domain types.
 * They exist only because src/lib/domain/types.ts was not available when the
 * design was built. Delete this file and import from "@/lib/domain/types"
 * (and "@/lib/costs") instead; the shapes are identical.
 */

// Domain types
export type FuelType = "petrol" | "diesel" | "lpg" | "hybrid" | "phev" | "ev";
export type Segment = "A" | "B" | "C" | "D" | "E" | "F";
export type BodyType =
  | "sedan_hatchback"
  | "estate"
  | "suv"
  | "coupe"
  | "convertible"
  | "mpv"
  | "van";
export type Transmission = "manual" | "automatic";
export type BrandTier = "budget" | "mainstream" | "premium";
export type ValueRetention = "high" | "average" | "low";

export interface CarInput {
  slug: string;
  make: string;
  model: string;
  variant: string;
  bodyType: BodyType;
  segment: Segment;
  fuelType: FuelType;
  transmission: Transmission;
  powerKw: number;
  engineCc: number | null;
  brandTier: BrandTier;
  valueRetention: ValueRetention;
  priceEur: number;
  listPricePln: number;
  priceObservedAt: string;
  priceSourceUrl: string;
  fuelL100: number | null;
  electricKwh100: number | null;
}
export interface Car extends CarInput {
  id: number;
}

export type MarketPriceKey = "petrol" | "diesel" | "lpg" | "electricity";
export interface MarketPrice {
  key: MarketPriceKey | "eur_pln";
  pricePln: number;
  observedAt: string;
  source: string;
  sourceUrl: string;
}
export type MarketPrices = Record<MarketPriceKey, MarketPrice>;

// Assumptions
export type DriverAgeBand =
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-59"
  | "60-64"
  | "65-69"
  | "70-74"
  | "75+";
export interface Assumptions {
  annualMileageKm: number;
  ownershipYears: number;
  insurance:
    | { mode: "estimate"; driverAgeBand: DriverAgeBand; coverage: "oc" | "oc_ac" }
    | { mode: "custom"; annualPremiumPln: number };
}
export type Period = "month" | "year";

// Cost engine
export type CostKey =
  | "depreciation"
  | "fuel"
  | "insurance"
  | "service"
  | "parts"
  | "fees";
export type CostMap = Record<CostKey, number> & { total: number; maintenance: number };
export interface CostBreakdown {
  purchasePricePln: number;
  residualValuePln: number;
  residualValuePct: number;
  overOwnership: CostMap;
  perYear: CostMap;
  perMonth: CostMap;
  costPerKm: number;
}

export type AffordabilityLevel =
  | "comfortable"
  | "reasonable"
  | "stretch"
  | "not_recommended";
export interface IncomeRange {
  level: AffordabilityLevel;
  minIncomePln: number | null;
  maxIncomePln: number | null;
}

export type RankingMetric =
  | "price"
  | "totalCost"
  | "depreciation"
  | "maintenance"
  | "service"
  | "parts"
  | "fuelConsumption"
  | "fuelCost"
  | "insurance";
export interface RankingFilters {
  makes?: string[];
  segments?: Segment[];
  bodyTypes?: BodyType[];
  fuelTypes?: FuelType[];
  transmission?: Transmission;
  priceMin?: number;
  priceMax?: number;
  query?: string;
}
export interface RankedCar {
  car: Car;
  costs: CostBreakdown;
  value: number;
  rank: number;
}
