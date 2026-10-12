/*
 * Sample data for the design preview. The cars are real rows of the catalogue
 * (data/fixtures/cars.json, copied by hand), chosen to show the hard cases:
 * a 103-character name with "/"-joined parts, five more names of about 100
 * characters, two cars that share one name (manual and automatic), electric
 * cars with the rated power the source gives (Tesla Model 3: 88 kW), hybrids,
 * plug-in hybrids, LPG and the make "DS".
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
  ["fiat-panda-sedan-hatchback-hybrid-manual-52kw", "Fiat", "PANDA", "PANDA 1.0 BSG (70ch)", "sedan_hatchback", "B", "hybrid", "manual", 52, 999, "mainstream", "low", 12465, 54900, 5.3, null],
  ["dacia-sandero-sedan-hatchback-petrol-manual-67kw", "Dacia", "SANDERO", "SANDERO (91ch)", "sedan_hatchback", "B", "petrol", "manual", 67, 999, "budget", "high", 14400, 63500, 5.3, null],
  ["dacia-sandero-sedan-hatchback-lpg-manual-74kw", "Dacia", "SANDERO", "SANDERO (101ch)", "sedan_hatchback", "B", "lpg", "manual", 74, 999, "budget", "high", 15350, 67700, 7.2, null],
  ["dacia-sandero-sedan-hatchback-petrol-automatic-67kw", "Dacia", "SANDERO", "SANDERO (91ch)", "sedan_hatchback", "B", "petrol", "automatic", 67, 999, "budget", "high", 16750, 73800, 5.8, null],
  ["citroen-c3-sedan-hatchback-petrol-manual-61kw", "Citroën", "C3", "C3 (83ch)", "sedan_hatchback", "B", "petrol", "manual", 61, 1199, "mainstream", "low", 18673, 82300, 5.5, null],
  ["dacia-spring-sedan-hatchback-ev-automatic-19kw", "Dacia", "SPRING", "SPRING (19Kw)", "sedan_hatchback", "A", "ev", "automatic", 19, null, "budget", "high", 20550, 90600, null, 13.9],
  ["toyota-yaris-sedan-hatchback-hybrid-automatic-68kw", "Toyota", "YARIS", "Yaris 1.5L (116ch) Hybrid Dynamic Business Pack. Design", "sedan_hatchback", "B", "hybrid", "automatic", 68, 1490, "mainstream", "high", 25263, 111300, 4.3, null],
  ["renault-clio-sedan-hatchback-hybrid-automatic-69kw", "Renault", "CLIO", "CLIO (94ch+24Kw)", "sedan_hatchback", "B", "hybrid", "automatic", 69, 1598, "mainstream", "average", 25133, 110800, 4.5, null],
  ["skoda-octavia-estate-petrol-manual-81kw", "Škoda", "OCTAVIA", "OCTAVIA Combi 1.0 TSI (110ch) BVM6", "estate", "D", "petrol", "manual", 81, 999, "mainstream", "average", 27183, 119800, 5.5, null],
  ["skoda-kamiq-suv-petrol-automatic-81kw", "Škoda", "KAMIQ", "Kamiq 1.0 TSI (110ch) DSG7 Norme AP châssis classique Monte-Carlo clA Full LED et alt 140A famA", "suv", "C", "petrol", "automatic", 81, 999, "mainstream", "average", 27693, 122100, 6.1, null],
  ["kia-xceed-suv-phev-automatic-77kw", "Kia", "XCEED", "XCEED 1.6 essence GDi (105ch) ISG / Electrique (60.5ch) DCT6 Système hybride rechargeable (141ch)", "suv", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 36853, 162400, 1.4, 12.3],
  ["kia-ceed-estate-phev-automatic-77kw", "Kia", "CEED", "CEED SW 1.6 essence GDi (105ch) ISG / Electrique (60.5ch) DCT6 Système hybride rechargeable (141ch)", "estate", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 38722, 170700, 1.3, 11.6],
  ["jeep-compass-suv-hybrid-manual-96kw", "Jeep", "COMPASS", "COMPASS 1.5 Turbo T4 (130ch) BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "manual", 96, 1469, "mainstream", "average", 40333, 177800, 5.9, null],
  ["kia-niro-suv-phev-automatic-77kw", "Kia", "NIRO", "Niro PHEV 1.6 essence Gdi (105ch) ISG / Electrique (83ch) DCT6 Syst. Hybride rechargeable (183ch)", "suv", "C", "phev", "automatic", 77, 1580, "mainstream", "average", 42050, 185300, 0.9, 13.5],
  ["tesla-model-3-sedan-hatchback-ev-automatic-88kw", "Tesla", "MODEL 3", "MODEL 3 (88Kw)", "sedan_hatchback", "F", "ev", "automatic", 88, null, "premium", "average", 53490, 235800, null, 14.4],
  ["ds-7-crossback-suv-phev-automatic-133kw", "DS", "7 CROSSBACK", "7 CROSSBACK (181ch+30Kw)", "suv", "D", "phev", "automatic", 133, 1598, "premium", "low", 57560, 253700, 1.5, 16.3],
  ["kia-sorento-suv-phev-automatic-132kw", "Kia", "SORENTO", "SORENTO 1.6T-GDi (180ch) / Electrique (91ch) BVA6 4x4 Système hybride rechargeable (265ch) - 5PL", "suv", "E", "phev", "automatic", 132, 1598, "mainstream", "average", 59168, 260800, 1.6, 18.4],
  /*
   * Stress rows, NOT in the catalogue: two invented siblings of the Jeep above
   * with the same 103-character name, so that the comparison can be previewed
   * with three such names side by side (preview "compare-long-names").
   */
  ["jeep-compass-suv-hybrid-automatic-96kw", "Jeep", "COMPASS", "COMPASS 1.5 Turbo T4 (130ch) BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "automatic", 96, 1469, "mainstream", "average", 41600, 183400, 6.0, null],
  ["jeep-compass-suv-hybrid-automatic-110kw", "Jeep", "COMPASS", "COMPASS 1.5 Turbo T4 (130ch) BVR7 Longitude/Longitude Business/Night Eagle/Limited/High Altitude/S", "suv", "D", "hybrid", "automatic", 110, 1469, "mainstream", "average", 43100, 190000, 6.2, null],
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
  "fiat-panda-sedan-hatchback-hybrid-manual-52kw": [494, 411, 205, 76, 61, 14],
  "dacia-sandero-sedan-hatchback-petrol-manual-67kw": [476, 411, 212, 78, 64, 14],
  "dacia-sandero-sedan-hatchback-lpg-manual-74kw": [508, 279, 216, 84, 64, 14],
  "dacia-sandero-sedan-hatchback-petrol-automatic-67kw": [553, 450, 220, 80, 64, 14],
  "citroen-c3-sedan-hatchback-petrol-manual-61kw": [741, 426, 226, 82, 66, 14],
  "dacia-spring-sedan-hatchback-ev-automatic-19kw": [680, 191, 228, 52, 48, 14],
  "toyota-yaris-sedan-hatchback-hybrid-automatic-68kw": [835, 333, 262, 92, 70, 14],
  "renault-clio-sedan-hatchback-hybrid-automatic-69kw": [923, 349, 266, 90, 72, 14],
  "skoda-octavia-estate-petrol-manual-81kw": [998, 426, 290, 104, 86, 14],
  "skoda-kamiq-suv-petrol-automatic-81kw": [1018, 473, 296, 102, 88, 14],
  "kia-xceed-suv-phev-automatic-77kw": [1353, 270, 348, 118, 96, 14],
  "kia-ceed-estate-phev-automatic-77kw": [1423, 260, 356, 118, 96, 14],
  "jeep-compass-suv-hybrid-manual-96kw": [1482, 457, 372, 128, 104, 14],
  "kia-niro-suv-phev-automatic-77kw": [1544, 255, 378, 120, 98, 14],
  "tesla-model-3-sedan-hatchback-ev-automatic-88kw": [1965, 198, 498, 74, 118, 14],
  "ds-7-crossback-suv-phev-automatic-133kw": [2283, 340, 540, 176, 142, 14],
  "kia-sorento-suv-phev-automatic-132kw": [2173, 377, 552, 168, 148, 14],
  "jeep-compass-suv-hybrid-automatic-96kw": [1532, 465, 380, 128, 104, 14],
  "jeep-compass-suv-hybrid-automatic-110kw": [1590, 480, 392, 130, 106, 14],
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

const PANDA = "fiat-panda-sedan-hatchback-hybrid-manual-52kw";
const SANDERO_MANUAL = "dacia-sandero-sedan-hatchback-petrol-manual-67kw";
const SANDERO_LPG = "dacia-sandero-sedan-hatchback-lpg-manual-74kw";
const SANDERO_AUTOMATIC = "dacia-sandero-sedan-hatchback-petrol-automatic-67kw";
const C3 = "citroen-c3-sedan-hatchback-petrol-manual-61kw";
const SPRING = "dacia-spring-sedan-hatchback-ev-automatic-19kw";
const YARIS = "toyota-yaris-sedan-hatchback-hybrid-automatic-68kw";
const CLIO = "renault-clio-sedan-hatchback-hybrid-automatic-69kw";
const OCTAVIA = "skoda-octavia-estate-petrol-manual-81kw";
const KAMIQ = "skoda-kamiq-suv-petrol-automatic-81kw";
const XCEED = "kia-xceed-suv-phev-automatic-77kw";
const CEED = "kia-ceed-estate-phev-automatic-77kw";
const JEEP = "jeep-compass-suv-hybrid-manual-96kw";
const NIRO = "kia-niro-suv-phev-automatic-77kw";
const TESLA = "tesla-model-3-sedan-hatchback-ev-automatic-88kw";

/** Home: top 5 by purchase price. Ranks 2 and 4 share a name and differ in gearbox. */
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

/** Long-name previews: five real cars whose names have about 100 characters. */
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

/** Car page: petrol (plain power), electric (power according to the source data), hybrid with the 103-character name. */
export const mockCar = bySlug(SANDERO_MANUAL);
export const mockCarElectric = bySlug(TESLA);
export const mockCarLongName = bySlug(JEEP);

/** Car page: income ranges per car for its total monthly cost, as requiredIncome() returns them. */
export const mockIncomeRanges: Record<string, IncomeRange[]> = {
  [SANDERO_MANUAL]: [
    { level: "comfortable", minIncomePln: 12600, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 8400, maxIncomePln: 12600 },
    { level: "stretch", minIncomePln: 6300, maxIncomePln: 8400 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 6300 },
  ],
  [TESLA]: [
    { level: "comfortable", minIncomePln: 28700, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 19200, maxIncomePln: 28700 },
    { level: "stretch", minIncomePln: 14400, maxIncomePln: 19200 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 14400 },
  ],
  [JEEP]: [
    { level: "comfortable", minIncomePln: 25600, maxIncomePln: null },
    { level: "reasonable", minIncomePln: 17100, maxIncomePln: 25600 },
    { level: "stretch", minIncomePln: 12800, maxIncomePln: 17100 },
    { level: "not_recommended", minIncomePln: null, maxIncomePln: 12800 },
  ],
};

/**
 * Comparison previews.
 * Two cars: the same name, manual and automatic (only the attributes tell them apart).
 * Three cars: petrol, hybrid with the 103-character name, electric (the three power labels).
 * Long names: three cars with the 103-character name (two of them are stress rows).
 */
export const mockCompareTwo = [SANDERO_MANUAL, SANDERO_AUTOMATIC];
export const mockCompareThree = [SANDERO_MANUAL, JEEP, TESLA];
/** The two invented rows: keep them out of lists and search results. */
export const mockStressSlugs = [
  "jeep-compass-suv-hybrid-automatic-96kw",
  "jeep-compass-suv-hybrid-automatic-110kw",
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
