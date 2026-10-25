/*
 * Sample data for the design preview. The cars are real rows of the catalogue
 * (data/fixtures/cars.json, copied by hand), chosen to show the hard cases:
 * a 103-character name with "/"-joined parts, five more names of about 100
 * characters, two cars that share one name (manual and automatic), electric
 * cars with the rated power the source gives (Tesla Model 3: 88 kW), hybrids,
 * plug-in hybrids, LPG and the make "DS". Names and slugs follow the catalogue
 * rules: names without the power marker and French words, models in normal case;
 * slug = make-model[-body]-fuel-gearbox-<KM>km, no body for "sedan_hatchback".
 * The costs are plausible hand-written values; nothing here comes from the
 * cost engine. In the real pages every import of this file is replaced with data from
 * src/lib/data and src/lib/costs.
 */
import type {
  Assumptions,
  Car,
  CostBreakdown,
  CostKey,
  CostMap,
  IncomeRange,
  RankedCar,
} from "./types";

export const mockAssumptions: Assumptions = {
  annualMileageKm: 15000,
  ownershipYears: 5,
  insurance: { mode: "estimate", driverAgeBand: "35-44", coverage: "oc_ac" },
};

export const mockDates = {
  /** Last successful refresh run. */
  checkedAt: "2026-10-11",
  /** Weekly Oil Bulletin. */
  fuelPricesAt: "2026-10-05",
  /** ADEME dataset, last data update. */
  catalogAt: "2026-09-14",
};

export const mockCatalogSize = 489;
/** Cars left by the filters of the rankings preview (segments A to D, up to 200 000 zł). */
export const mockFilteredSize = 287;

const SOURCE_URL = "https://data.ademe.fr/datasets/ademe-car-labelling";

type Row = [
  slug: string,
  make: string,
  model: string,
  variant: string,
  bodyType: Car["bodyType"],
  segment: Car["segment"],
  fuelType: Car["fuelType"],
  transmission: Car["transmission"],
  powerKw: number,
  engineCc: number | null,
  brandTier: Car["brandTier"],
  valueRetention: Car["valueRetention"],
  priceEur: number,
  listPricePln: number,
  fuelL100: number | null,
  electricKwh100: number | null,
];

const ROWS: Row[] = [
  ["fiat-panda-hybrid-manual-71km", "Fiat", "PANDA", "Panda 1.0 BSG", "sedan_hatchback", "B", "hybrid", "manual", 52, 999, "mainstream", "low", 12465, 54900, 5.3, null],
  ["dacia-sandero-petrol-manual-91km", "Dacia", "SANDERO", "Sandero", "sedan_hatchback", "B", "petrol", "manual", 67, 999, "budget", "high", 14400, 63500, 5.3, null],
  ["dacia-sandero-lpg-manual-101km", "Dacia", "SANDERO", "Sandero", "sedan_hatchback", "B", "lpg", "manual", 74, 999, "budget", "high", 15350, 67700, 7.2, null],
  ["dacia-sandero-petrol-automatic-91km", "Dacia", "SANDERO", "Sandero", "sedan_hatchback", "B", "petrol", "automatic", 67, 999, "budget", "high", 16750, 73800, 5.8, null],
  ["citroen-c3-petrol-manual-83km", "Citroën", "C3", "C3", "sedan_hatchback", "B", "petrol", "manual", 61, 1199, "mainstream", "low", 18673, 82300, 5.5, null],
  ["dacia-spring-ev-automatic-26km", "Dacia", "SPRING", "Spring", "sedan_hatchback", "A", "ev", "automatic", 19, null, "budget", "high", 20550, 90600, null, 13.9],
  ["toyota-yaris-hybrid-automatic-92km", "Toyota", "YARIS", "Yaris 1.5L Hybrid Dynamic Business Pack. Design", "sedan_hatchback", "B", "hybrid", "automatic", 68, 1490, "mainstream", "high", 25263, 111300, 4.3, null],
  ["renault-clio-hybrid-automatic-94km", "Renault", "CLIO", "Clio", "sedan_hatchback", "B", "hybrid", "automatic", 69, 1598, "mainstream", "average", 25133, 110800, 4.5, null],
  ["skoda-octavia-estate-petrol-manual-110km", "Škoda", "OCTAVIA", "Octavia Combi 1.0 TSI", "estate", "D", "petrol", "manual", 81, 999, "mainstream", "average", 27183, 119800, 5.5, null],
  ["skoda-kamiq-suv-petrol-automatic-110km", "Škoda", "KAMIQ", "Kamiq 1.0 TSI DSG7 Norme AP châssis classique Monte-Carlo clA Full LED et alt 140A famA", "suv", "C", "petrol", "automatic", 81, 999, "mainstream", "average", 27693, 122100, 6.1, null],
  ["kia-xceed-suv-phev-automatic-105km", "Kia", "XCEED", "Xceed 1.6 GDi ISG / Electric (60.5ch) DCT6 Système Hybrid rechargeable", "suv", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 36853, 162400, 1.4, 12.3],
  ["kia-ceed-estate-phev-automatic-105km", "Kia", "CEED", "Ceed SW 1.6 GDi ISG / Electric (60.5ch) DCT6 Système Hybrid rechargeable", "estate", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 38722, 170700, 1.3, 11.6],
  ["jeep-compass-suv-hybrid-manual-131km", "Jeep", "COMPASS", "Compass 1.5 Turbo T4 BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "manual", 96, 1469, "mainstream", "average", 40333, 177800, 5.9, null],
  ["kia-niro-suv-phev-automatic-105km", "Kia", "NIRO", "Niro PHEV 1.6 Gdi ISG / Electric DCT6 Syst. Hybrid rechargeable", "suv", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 42050, 185300, 0.9, 13.5],
  ["tesla-model-3-ev-automatic-120km", "Tesla", "MODEL 3", "Model 3", "sedan_hatchback", "F", "ev", "automatic", 88, null, "premium", "average", 53490, 235800, null, 14.4],
  ["ds-7-crossback-suv-phev-automatic-181km", "DS", "7 CROSSBACK", "7 Crossback", "suv", "D", "phev", "automatic", 133, 1598, "premium", "low", 57560, 253700, 1.5, 16.3],
  ["kia-sorento-suv-phev-automatic-179km", "Kia", "SORENTO", "Sorento 1.6T-GDi / Electric 4x4 Système Hybrid rechargeable - 5PL", "suv", "E", "phev", "automatic", 132, 1598, "mainstream", "average", 59168, 260800, 1.6, 18.4],
  /*
   * Stress rows, NOT in the catalogue: two invented siblings of the Jeep above
   * with the same 103-character name, so that the comparison can be previewed
   * with three such names side by side (preview "compare-long-names").
   */
  ["jeep-compass-suv-hybrid-automatic-131km", "Jeep", "COMPASS", "Compass 1.5 Turbo T4 eHybrid BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "automatic", 96, 1469, "mainstream", "average", 41600, 183400, 6.0, null],
  ["jeep-compass-suv-hybrid-automatic-150km", "Jeep", "COMPASS", "Compass 1.5 Turbo T4 eHybrid BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "automatic", 110, 1469, "mainstream", "average", 43100, 190000, 6.2, null],
];

export const mockCars: Car[] = ROWS.map((row, index) => ({
  id: index + 1,
  slug: row[0],
  make: row[1],
  model: row[2],
  variant: row[3],
  bodyType: row[4],
  segment: row[5],
  fuelType: row[6],
  transmission: row[7],
  powerKw: row[8],
  engineCc: row[9],
  brandTier: row[10],
  valueRetention: row[11],
  priceEur: row[12],
  listPricePln: row[13],
  priceObservedAt: mockDates.catalogAt,
  priceSourceUrl: SOURCE_URL,
  fuelL100: row[14],
  electricKwh100: row[15],
}));

/** Monthly costs per car: [depreciation, fuel, insurance, service, parts, fees]. */
const MONTHLY: Record<string, number[]> = {
  "fiat-panda-hybrid-manual-71km": [494, 411, 205, 76, 61, 14],
  "dacia-sandero-petrol-manual-91km": [476, 411, 212, 78, 64, 14],
  "dacia-sandero-lpg-manual-101km": [508, 279, 216, 84, 64, 14],
  "dacia-sandero-petrol-automatic-91km": [553, 450, 220, 80, 64, 14],
  "citroen-c3-petrol-manual-83km": [741, 426, 226, 82, 66, 14],
  "dacia-spring-ev-automatic-26km": [680, 191, 228, 52, 48, 14],
  "toyota-yaris-hybrid-automatic-92km": [835, 333, 262, 92, 70, 14],
  "renault-clio-hybrid-automatic-94km": [923, 349, 266, 90, 72, 14],
  "skoda-octavia-estate-petrol-manual-110km": [998, 426, 290, 104, 86, 14],
  "skoda-kamiq-suv-petrol-automatic-110km": [1018, 473, 296, 102, 88, 14],
  "kia-xceed-suv-phev-automatic-105km": [1353, 270, 348, 118, 96, 14],
  "kia-ceed-estate-phev-automatic-105km": [1423, 260, 356, 118, 96, 14],
  "jeep-compass-suv-hybrid-manual-131km": [1482, 457, 372, 128, 104, 14],
  "kia-niro-suv-phev-automatic-105km": [1544, 255, 378, 120, 98, 14],
  "tesla-model-3-ev-automatic-120km": [1965, 198, 498, 74, 118, 14],
  "ds-7-crossback-suv-phev-automatic-181km": [2283, 340, 540, 176, 142, 14],
  "kia-sorento-suv-phev-automatic-179km": [2173, 377, 552, 168, 148, 14],
  "jeep-compass-suv-hybrid-automatic-131km": [1532, 465, 380, 128, 104, 14],
  "jeep-compass-suv-hybrid-automatic-150km": [1590, 480, 392, 130, 106, 14],
};

const KEYS: CostKey[] = ["depreciation", "fuel", "insurance", "service", "parts", "fees"];

function costMap(values: number[], factor: number): CostMap {
  const entries = KEYS.map((key, index) => [key, values[index] * factor] as const);
  const map = Object.fromEntries(entries) as Record<CostKey, number>;
  return {
    ...map,
    total: entries.reduce((sum, [, value]) => sum + value, 0),
    maintenance: map.service + map.parts + map.fees,
  };
}

export const mockCosts: Record<string, CostBreakdown> = Object.fromEntries(
  mockCars.map((car) => {
    const monthly = MONTHLY[car.slug];
    const perMonth = costMap(monthly, 1);
    const residual = Math.round((car.listPricePln - monthly[0] * 60) / 100) * 100;
    const breakdown: CostBreakdown = {
      purchasePricePln: car.listPricePln,
      residualValuePln: residual,
      // A percentage from 0 to 100, as the cost engine returns it (not a fraction).
      residualValuePct: (residual / car.listPricePln) * 100,
      perMonth,
      perYear: costMap(monthly, 12),
      overOwnership: costMap(monthly, 60),
      costPerKm: (perMonth.total * 12) / mockAssumptions.annualMileageKm,
    };
    return [car.slug, breakdown];
  }),
);

function ranked(slugs: string[], value: (car: Car, costs: CostBreakdown) => number): RankedCar[] {
  return slugs.map((slug, index) => {
    const car = mockCars.find((item) => item.slug === slug)!;
    const costs = mockCosts[slug];
    return { car, costs, value: value(car, costs), rank: index + 1 };
  });
}

const PANDA = "fiat-panda-hybrid-manual-71km";
const SANDERO_MANUAL = "dacia-sandero-petrol-manual-91km";
const SANDERO_LPG = "dacia-sandero-lpg-manual-101km";
const SANDERO_AUTOMATIC = "dacia-sandero-petrol-automatic-91km";
const C3 = "citroen-c3-petrol-manual-83km";
const SPRING = "dacia-spring-ev-automatic-26km";
const YARIS = "toyota-yaris-hybrid-automatic-92km";
const CLIO = "renault-clio-hybrid-automatic-94km";
const OCTAVIA = "skoda-octavia-estate-petrol-manual-110km";
const KAMIQ = "skoda-kamiq-suv-petrol-automatic-110km";
const XCEED = "kia-xceed-suv-phev-automatic-105km";
const CEED = "kia-ceed-estate-phev-automatic-105km";
const JEEP = "jeep-compass-suv-hybrid-manual-131km";
const NIRO = "kia-niro-suv-phev-automatic-105km";
const TESLA = "tesla-model-3-ev-automatic-120km";

/** Home: top 5 by purchase price. Ranks 2 to 4 share a name and differ in powertrain or gearbox. */
export const mockTopByPrice: RankedCar[] = ranked(
  [PANDA, SANDERO_MANUAL, SANDERO_LPG, SANDERO_AUTOMATIC, C3],
  (car) => car.listPricePln,
);

/** Rankings: 10 cars by total monthly cost. The first 5 are the home list; the last two have very long names. */
export const mockRankingByTotalCost: RankedCar[] = ranked(
  [SANDERO_LPG, SPRING, SANDERO_MANUAL, PANDA, SANDERO_AUTOMATIC, C3, YARIS, CLIO, KAMIQ, JEEP],
  (_car, costs) => costs.perMonth.total,
);

/** Rankings by fuel consumption (l/100 km): no plug-in hybrids and no electric cars. */
export const mockRankingByConsumption: RankedCar[] = ranked(
  [YARIS, CLIO, PANDA, SANDERO_MANUAL, C3, OCTAVIA, SANDERO_AUTOMATIC, JEEP, KAMIQ, SANDERO_LPG],
  (car) => car.fuelL100 ?? 0,
);

/** Long-name previews: five real cars with long names (67 to 95 characters). */
export const mockLongNamesByPrice: RankedCar[] = ranked(
  [KAMIQ, XCEED, CEED, JEEP, NIRO],
  (car) => car.listPricePln,
);
export const mockLongNamesByTotalCost: RankedCar[] = ranked(
  [KAMIQ, XCEED, CEED, NIRO, JEEP],
  (_car, costs) => costs.perMonth.total,
);

function bySlug(slug: string): Car {
  return mockCars.find((car) => car.slug === slug)!;
}

/**
 * Car page: petrol (plain power), electric (power according to the source data),
 * hybrid with the 103-character name (the first stress row: no cleaned catalogue
 * name is that long, so the page is checked with more than the real maximum).
 */
const JEEP_STRESS = "jeep-compass-suv-hybrid-automatic-131km";
export const mockCar = bySlug(SANDERO_MANUAL);
export const mockCarElectric = bySlug(TESLA);
export const mockCarLongName = bySlug(JEEP_STRESS);

/**
 * Car page: income ranges per car for its monthly affordability cost (purchase price / 60
 * months + monthly fuel, monthlyAffordabilityCost() with the mock assumptions), as requiredIncome()
 * returns them (shares 15%, 20% and 25% of net income, rounded to 100 zł).
 */
export const mockIncomeRanges: Record<string, IncomeRange[]> = {
  [SANDERO_MANUAL]: [
    { level: "comfortable", minIncomePln: 9800, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 7300, maxIncomePln: 9800 },
    { level: "stretch", minIncomePln: 5900, maxIncomePln: 7300 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 5900 },
  ],
  [TESLA]: [
    { level: "comfortable", minIncomePln: 27500, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 20600, maxIncomePln: 27500 },
    { level: "stretch", minIncomePln: 16500, maxIncomePln: 20600 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 16500 },
  ],
  [JEEP]: [
    { level: "comfortable", minIncomePln: 22800, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 17100, maxIncomePln: 22800 },
    { level: "stretch", minIncomePln: 13700, maxIncomePln: 17100 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 13700 },
  ],
  [JEEP_STRESS]: [
    { level: "comfortable", minIncomePln: 23500, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 17600, maxIncomePln: 23500 },
    { level: "stretch", minIncomePln: 14100, maxIncomePln: 17600 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 14100 },
  ],
};

/**
 * Comparison previews.
 * Two cars: the same name, manual and automatic (only the attributes tell them apart).
 * Three cars: petrol, hybrid with the longest real name (95 characters), electric (the three power labels).
 * Long names: the 95-character Jeep and the two stress rows with 103 characters.
 */
export const mockCompareTwo = [SANDERO_MANUAL, SANDERO_AUTOMATIC];
export const mockCompareThree = [SANDERO_MANUAL, JEEP, TESLA];
/** The two invented rows: keep them out of lists and search results. */
export const mockStressSlugs = [
  JEEP_STRESS,
  "jeep-compass-suv-hybrid-automatic-150km",
];
export const mockCompareLongNames = [JEEP, ...mockStressSlugs];
/** Comparison is full and the car on screen is not in it (car page, long name). */
export const mockCompareFullOthers = [SANDERO_MANUAL, SANDERO_AUTOMATIC, TESLA];

/** Filter option counts (number of cars behind each option), as in the catalogue of 489 cars. */
export const mockFilterCounts = {
  body: { sedan_hatchback: 151, estate: 54, suv: 175, coupe: 30, convertible: 29, mpv: 15, van: 35 },
  fuel: { petrol: 199, diesel: 118, lpg: 4, hybrid: 80, phev: 40, ev: 48 },
  segment: { A: 12, B: 140, C: 116, D: 82, E: 61, F: 78 },
} as const;

/** All 37 makes of the catalogue for the filter list, with counts. The make is "DS", as in the data. */
export const mockMakes: { name: string; count: number }[] = [
  { name: "Alfa Romeo", count: 12 },
  { name: "Alpine", count: 2 },
  { name: "Audi", count: 9 },
  { name: "BMW", count: 95 },
  { name: "Citroën", count: 14 },
  { name: "Cupra", count: 2 },
  { name: "Dacia", count: 8 },
  { name: "DS", count: 7 },
  { name: "Ferrari", count: 4 },
  { name: "Fiat", count: 3 },
  { name: "Ford", count: 22 },
  { name: "Honda", count: 5 },
  { name: "Hyundai", count: 17 },
  { name: "Jeep", count: 6 },
  { name: "Kia", count: 45 },
  { name: "Lamborghini", count: 5 },
  { name: "Land Rover", count: 1 },
  { name: "Lexus", count: 2 },
  { name: "Maserati", count: 3 },
  { name: "Mazda", count: 4 },
  { name: "Mercedes-Benz", count: 7 },
  { name: "MG", count: 4 },
  { name: "MINI", count: 31 },
  { name: "Mitsubishi", count: 2 },
  { name: "Nissan", count: 10 },
  { name: "Opel", count: 8 },
  { name: "Peugeot", count: 25 },
  { name: "Porsche", count: 29 },
  { name: "Renault", count: 50 },
  { name: "Rolls-Royce", count: 2 },
  { name: "Škoda", count: 18 },
  { name: "Subaru", count: 2 },
  { name: "Suzuki", count: 10 },
  { name: "Tesla", count: 2 },
  { name: "Toyota", count: 8 },
  { name: "Volkswagen", count: 13 },
  { name: "Volvo", count: 2 },
];
