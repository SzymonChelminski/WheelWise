import { describe, expect, it } from 'vitest';
import {
  ademeRowSchema,
  buildCatalog,
  displayVariant,
  type AdemeRow,
  type BrandInfo,
  type BuildResult,
} from '@/lib/catalog';

// Catalogue builder rules. Every expected value below is a literal worked out
// from the rules by hand; nothing is read from src/config.

const BRANDS: Record<string, BrandInfo> = {
  DACIA: { displayName: 'Dacia', tier: 'budget', retention: 'high' },
  'B.M.W.': { displayName: 'BMW', tier: 'premium', retention: 'average' },
  SKODA: { displayName: 'Škoda', tier: 'mainstream', retention: 'average' },
  CITROEN: { displayName: 'Citroën', tier: 'mainstream', retention: 'low' },
  KIA: { displayName: 'Kia', tier: 'mainstream', retention: 'average' },
  TESLA: { displayName: 'Tesla', tier: 'premium', retention: 'average' },
  NISSAN: { displayName: 'Nissan', tier: 'mainstream', retention: 'average' },
  TOYOTA: { displayName: 'Toyota', tier: 'mainstream', retention: 'high' },
  MINI: { displayName: 'MINI', tier: 'premium', retention: 'average' },
  MERCEDES: { displayName: 'Mercedes-Benz', tier: 'premium', retention: 'average' },
  PORSCHE: { displayName: 'Porsche', tier: 'premium', retention: 'high' },
};

const SOURCE_URL = 'https://example.org/dataset';

/** A valid petrol row: Dacia Sandero, 67 kW, manual, 12 000 EUR, 5.0-5.6 l/100 km. */
function row(overrides: Partial<AdemeRow> = {}): AdemeRow {
  return {
    Marque: 'DACIA',
    Modèle: 'SANDERO',
    Description_Commerciale: 'SANDERO (91ch)',
    Energie: 'ESSENCE',
    Carrosserie: 'BERLINE',
    Gamme: 'INFERIEURE',
    Cylindrée: 999,
    Puissance_maximale: 67,
    Puissance_nominale_électrique: null,
    Type_de_boite: 'MECANIQUE',
    Conso_vitesse_mixte_Min: 5.0,
    Conso_vitesse_mixte_Max: 5.6,
    Conso_elec_Min: null,
    Conso_elec_Max: null,
    Prix_véhicule: 12000,
    ...overrides,
  };
}

/** A valid electric row: no maximum power, rated power 100 kW, 150-170 Wh/km. */
function electricRow(overrides: Partial<AdemeRow> = {}): AdemeRow {
  return row({
    Marque: 'KIA',
    Modèle: 'EV',
    Description_Commerciale: 'EV Standard',
    Energie: 'ELECTRIC',
    Cylindrée: 0,
    Puissance_maximale: null,
    Puissance_nominale_électrique: 100,
    Type_de_boite: 'VARIATION ELECTRIQUE',
    Conso_vitesse_mixte_Min: null,
    Conso_vitesse_mixte_Max: null,
    Conso_elec_Min: 150,
    Conso_elec_Max: 170,
    Prix_véhicule: 30000,
    ...overrides,
  });
}

/** A valid plug-in hybrid row: 1.2-1.4 l/100 km and 150-170 Wh/km. */
function plugInRow(overrides: Partial<AdemeRow> = {}): AdemeRow {
  return row({
    Energie: 'ELEC+ESSENC HR',
    Conso_vitesse_mixte_Min: 1.2,
    Conso_vitesse_mixte_Max: 1.4,
    Conso_elec_Min: 150,
    Conso_elec_Max: 170,
    ...overrides,
  });
}

/** A valid bi-fuel LPG row. */
function lpgRow(overrides: Partial<AdemeRow> = {}): AdemeRow {
  return row({
    Energie: 'ESS+G.P.L.',
    Description_Commerciale: 'SANDERO ECO-G (101ch)',
    Prix_véhicule: 13000,
    ...overrides,
  });
}

function build(rows: AdemeRow[], eurPln = 4.3): BuildResult {
  return buildCatalog(rows, {
    eurPln,
    observedAt: '2026-09-14',
    sourceUrl: SOURCE_URL,
    brands: BRANDS,
  });
}

/** Builds one row and returns its car; fails when the row did not become exactly one car. */
function only(input: AdemeRow, eurPln = 4.3) {
  const result = build([input], eurPln);
  expect(result.skipped).toEqual([]);
  expect(result.cars).toHaveLength(1);
  return result.cars[0];
}

function expectSkipped(input: AdemeRow, reason: string): void {
  const result = build([input]);
  expect(result.cars).toEqual([]);
  expect(result.skipped).toEqual([{ reason, count: 1 }]);
}

describe('buildCatalog - a complete car', () => {
  it('turns one valid row into one car with every field filled', () => {
    expect(only(row())).toEqual({
      slug: 'dacia-sandero-sedan-hatchback-petrol-manual-67kw',
      make: 'Dacia',
      model: 'SANDERO',
      variant: 'SANDERO (91ch)',
      bodyType: 'sedan_hatchback',
      segment: 'B',
      fuelType: 'petrol',
      transmission: 'manual',
      powerKw: 67,
      engineCc: 999,
      brandTier: 'budget',
      valueRetention: 'high',
      priceEur: 12000,
      // 12000 * 4.30 * 1.23 / 1.20 = 52890
      listPricePln: 52900,
      priceObservedAt: '2026-09-14',
      priceSourceUrl: SOURCE_URL,
      // mean of 5.0 and 5.6
      fuelL100: 5.3,
      electricKwh100: null,
    });
  });

  it('gives no cars, no skips and no unknown makes for no rows', () => {
    expect(build([])).toEqual({ cars: [], skipped: [], unknownMakes: [] });
  });
});

describe('buildCatalog - mapping of dataset values', () => {
  it.each([
    ['ESSENCE', 'petrol'],
    ['GAZOLE', 'diesel'],
    ['GAZ+ELEC HNR', 'diesel'],
    ['ESS+G.P.L.', 'lpg'],
    ['ESS+ELEC HNR', 'hybrid'],
  ])('energy %s becomes fuel type %s', (energy, fuelType) => {
    expect(only(row({ Energie: energy })).fuelType).toBe(fuelType);
  });

  it('energy ELEC+ESSENC HR becomes fuel type phev', () => {
    expect(only(plugInRow()).fuelType).toBe('phev');
  });

  it('energy ELECTRIC becomes fuel type ev', () => {
    expect(only(electricRow()).fuelType).toBe('ev');
  });

  it.each(['SUPERETHANOL', 'ELEC+GAZOLE HR'])(
    'energy %s is left out as unsupported-energy',
    (energy) => {
      expectSkipped(plugInRow({ Energie: energy }), 'unsupported-energy');
    },
  );

  it('an energy that is not in the table is skipped as unknown-energy', () => {
    expectSkipped(row({ Energie: 'HYDROGENE' }), 'unknown-energy');
    expectSkipped(row({ Energie: '' }), 'unknown-energy');
  });

  it.each([
    ['BERLINE', 'sedan_hatchback'],
    ['BREAK', 'estate'],
    ['TS TERRAINS/CHEMINS', 'suv'],
    ['COUPE', 'coupe'],
    ['CABRIOLET', 'convertible'],
    ['MONOSPACE', 'mpv'],
    ['MONOSPACE COMPACT', 'mpv'],
    ['MINISPACE', 'mpv'],
    ['COMBISPACE', 'van'],
    ['MINIBUS', 'van'],
  ])('body %s becomes %s', (body, bodyType) => {
    expect(only(row({ Carrosserie: body })).bodyType).toBe(bodyType);
  });

  it('a body that is not in the table is skipped as unknown-body', () => {
    expectSkipped(row({ Carrosserie: 'PICK-UP' }), 'unknown-body');
  });

  it.each([
    ['ECONOMIQUE', 'A'],
    ['INFERIEURE', 'B'],
    ['MOYENNE INFERIEURE', 'C'],
    ['MOYENNE SUPERIEURE', 'D'],
    ['SUPERIEURE', 'E'],
    ['LUXE', 'F'],
  ])('range class %s becomes segment %s', (range, segment) => {
    expect(only(row({ Gamme: range })).segment).toBe(segment);
  });

  it('a range class that is not in the table is skipped as unknown-range', () => {
    expectSkipped(row({ Gamme: 'MOYENNE' }), 'unknown-range');
  });

  it.each([
    ['MECANIQUE', 'manual'],
    ['AUTOMATIQUE', 'automatic'],
    ['VARIATION CONTINUE', 'automatic'],
    ['VARIATION ELECTRIQUE', 'automatic'],
  ])('gearbox %s becomes %s', (gearbox, transmission) => {
    expect(only(row({ Type_de_boite: gearbox })).transmission).toBe(transmission);
  });

  it('a gearbox that is not in the table is skipped as unknown-gearbox', () => {
    expectSkipped(row({ Type_de_boite: 'ROBOTISEE' }), 'unknown-gearbox');
  });

  it('values are matched after trimming and upper-casing', () => {
    const car = only(
      row({
        Energie: '  gazole ',
        Carrosserie: ' ts terrains/chemins',
        Gamme: 'Moyenne Superieure ',
        Type_de_boite: ' variation continue ',
      }),
    );
    expect(car).toMatchObject({
      fuelType: 'diesel',
      bodyType: 'suv',
      segment: 'D',
      transmission: 'automatic',
    });
  });

  it('a value that only starts with a known one does not match', () => {
    expectSkipped(row({ Carrosserie: 'BERLINE 5 PORTES' }), 'unknown-body');
    expectSkipped(row({ Energie: 'ESSENCE E10' }), 'unknown-energy');
  });
});

describe('buildCatalog - rows that are skipped', () => {
  it.each([null, 0])('price %s is skipped as no-price', (price) => {
    expectSkipped(row({ Prix_véhicule: price }), 'no-price');
  });

  it.each([4999, 1000001, -12000, 12000.5])('price %s is skipped as price-out-of-range', (price) => {
    expectSkipped(row({ Prix_véhicule: price }), 'price-out-of-range');
  });

  it.each([5000, 1000000])('price %i at the edge of the range is accepted', (price) => {
    expect(only(row({ Prix_véhicule: price })).priceEur).toBe(price);
  });

  it.each([null, 0, 19, 1201])('maximum power %s of a combustion car is skipped as no-power', (power) => {
    expectSkipped(row({ Puissance_maximale: power }), 'no-power');
  });

  it.each([20, 1200])('maximum power %i at the edge of the range is accepted', (power) => {
    expect(only(row({ Puissance_maximale: power })).powerKw).toBe(power);
  });

  it.each(['ESSENCE', 'GAZOLE', 'ESS+G.P.L.', 'ESS+ELEC HNR'])(
    'a %s row without fuel consumption is skipped as no-consumption',
    (energy) => {
      expectSkipped(
        row({ Energie: energy, Conso_vitesse_mixte_Min: null, Conso_vitesse_mixte_Max: null }),
        'no-consumption',
      );
    },
  );

  it('fuel consumption below 2 or above 25 l/100 km is skipped as no-consumption', () => {
    expectSkipped(row({ Conso_vitesse_mixte_Min: 1.9, Conso_vitesse_mixte_Max: 1.9 }), 'no-consumption');
    expectSkipped(row({ Conso_vitesse_mixte_Min: 25.1, Conso_vitesse_mixte_Max: 25.1 }), 'no-consumption');
  });

  it('fuel consumption of exactly 2 and exactly 25 l/100 km is accepted', () => {
    expect(only(row({ Conso_vitesse_mixte_Min: 2, Conso_vitesse_mixte_Max: 2 })).fuelL100).toBe(2);
    expect(only(row({ Conso_vitesse_mixte_Min: 25, Conso_vitesse_mixte_Max: 25 })).fuelL100).toBe(25);
  });

  it('an electric row without electricity consumption is skipped as no-consumption', () => {
    expectSkipped(electricRow({ Conso_elec_Min: null, Conso_elec_Max: null }), 'no-consumption');
  });

  it('an electric row is not rescued by a fuel consumption value', () => {
    expectSkipped(
      electricRow({
        Conso_elec_Min: null,
        Conso_elec_Max: null,
        Conso_vitesse_mixte_Min: 5,
        Conso_vitesse_mixte_Max: 5,
      }),
      'no-consumption',
    );
  });

  it('electricity consumption below 8 or above 40 kWh/100 km is skipped as no-consumption', () => {
    // The dataset gives Wh/km: 79 Wh/km = 7.9 kWh/100 km, 401 Wh/km = 40.1 kWh/100 km.
    expectSkipped(electricRow({ Conso_elec_Min: 79, Conso_elec_Max: 79 }), 'no-consumption');
    expectSkipped(electricRow({ Conso_elec_Min: 401, Conso_elec_Max: 401 }), 'no-consumption');
  });

  it('electricity consumption of exactly 8 and exactly 40 kWh/100 km is accepted', () => {
    expect(only(electricRow({ Conso_elec_Min: 80, Conso_elec_Max: 80 })).electricKwh100).toBe(8);
    expect(only(electricRow({ Conso_elec_Min: 400, Conso_elec_Max: 400 })).electricKwh100).toBe(40);
  });

  it('a plug-in hybrid needs both consumption values', () => {
    expectSkipped(plugInRow({ Conso_elec_Min: null, Conso_elec_Max: null }), 'no-consumption');
    expectSkipped(
      plugInRow({ Conso_vitesse_mixte_Min: null, Conso_vitesse_mixte_Max: null }),
      'no-consumption',
    );
  });

  it('a plug-in hybrid may use as little as 0.3 l/100 km, but not less', () => {
    expect(only(plugInRow({ Conso_vitesse_mixte_Min: 0.3, Conso_vitesse_mixte_Max: 0.3 })).fuelL100).toBe(0.3);
    expectSkipped(plugInRow({ Conso_vitesse_mixte_Min: 0.2, Conso_vitesse_mixte_Max: 0.2 }), 'no-consumption');
  });

  it('a petrol car using 0.3 l/100 km is skipped: the low limit is for plug-in hybrids only', () => {
    expectSkipped(row({ Conso_vitesse_mixte_Min: 0.3, Conso_vitesse_mixte_Max: 0.3 }), 'no-consumption');
  });

  it.each([
    ['make', { Marque: '' }],
    ['make (spaces only)', { Marque: '   ' }],
    ['model', { Modèle: '' }],
    ['model (spaces only)', { Modèle: '  ' }],
    ['description', { Description_Commerciale: '' }],
    ['description (spaces only)', { Description_Commerciale: ' \t ' }],
  ] as [string, Partial<AdemeRow>][])('a row with an empty %s is skipped as missing-name', (_field, overrides) => {
    const result = build([row(overrides)]);
    expect(result.cars).toEqual([]);
    expect(result.skipped).toEqual([{ reason: 'missing-name', count: 1 }]);
  });

  it('a row gets one reason only, checked in the order name, price, power, energy, body, range, gearbox, consumption', () => {
    const broken: Partial<AdemeRow> = {
      Description_Commerciale: '',
      Prix_véhicule: null,
      Puissance_maximale: null,
      Energie: 'HYDROGENE',
      Carrosserie: 'PICK-UP',
      Gamme: 'MOYENNE',
      Type_de_boite: 'ROBOTISEE',
      Conso_vitesse_mixte_Min: null,
      Conso_vitesse_mixte_Max: null,
    };
    const fixes: [keyof AdemeRow, AdemeRow[keyof AdemeRow], string][] = [
      ['Description_Commerciale', 'SANDERO (91ch)', 'missing-name'],
      ['Prix_véhicule', 12000, 'no-price'],
      ['Puissance_maximale', 67, 'no-power'],
      ['Energie', 'ESSENCE', 'unknown-energy'],
      ['Carrosserie', 'BERLINE', 'unknown-body'],
      ['Gamme', 'INFERIEURE', 'unknown-range'],
      ['Type_de_boite', 'MECANIQUE', 'unknown-gearbox'],
      ['Conso_vitesse_mixte_Min', 5, 'no-consumption'],
    ];
    // Repair one defect at a time, in the documented order: the reason reported is
    // always the first defect still present.
    const current = { ...broken };
    for (const [field, value, reasonBeforeFix] of fixes) {
      expect(build([row(current)]).skipped).toEqual([{ reason: reasonBeforeFix, count: 1 }]);
      Object.assign(current, { [field]: value });
    }
    expect(build([row(current)]).cars).toHaveLength(1);
  });

  it('an unsupported energy is reported before a missing consumption', () => {
    expectSkipped(
      row({ Energie: 'SUPERETHANOL', Conso_vitesse_mixte_Min: null, Conso_vitesse_mixte_Max: null }),
      'unsupported-energy',
    );
  });

  it('counts skipped rows per reason, sorted by reason, next to the cars that were built', () => {
    const result = build([
      row(),
      row({ Prix_véhicule: null }),
      row({ Energie: 'SUPERETHANOL' }),
      row({ Prix_véhicule: 0 }),
      row({ Carrosserie: 'PICK-UP' }),
      row({ Energie: 'ELEC+GAZOLE HR' }),
      row({ Prix_véhicule: null }),
    ]);
    expect(result.cars).toHaveLength(1);
    expect(result.skipped).toEqual([
      { reason: 'no-price', count: 3 },
      { reason: 'unknown-body', count: 1 },
      { reason: 'unsupported-energy', count: 2 },
    ]);
  });
});

describe('buildCatalog - grouping into cars', () => {
  it('versions that differ only in description, price, range class or engine size are one car', () => {
    const result = build([
      row({ Description_Commerciale: 'SANDERO Expression', Prix_véhicule: 14000 }),
      row({ Description_Commerciale: 'SANDERO Essential', Prix_véhicule: 12500, Cylindrée: 1100 }),
      row({ Description_Commerciale: 'SANDERO Journey', Prix_véhicule: 16000, Gamme: 'MOYENNE INFERIEURE' }),
    ]);
    expect(result.cars).toHaveLength(1);
  });

  it.each([
    ['make', { Marque: 'KIA' }],
    ['model', { Modèle: 'LOGAN' }],
    ['body type', { Carrosserie: 'BREAK' }],
    ['fuel type', { Energie: 'GAZOLE' }],
    ['transmission', { Type_de_boite: 'AUTOMATIQUE' }],
    ['power', { Puissance_maximale: 81 }],
  ] as [string, Partial<AdemeRow>][])('rows that differ in %s are separate cars', (_field, overrides) => {
    expect(build([row(), row(overrides)]).cars).toHaveLength(2);
  });

  it('power is compared after rounding to a whole kilowatt', () => {
    const sameAfterRounding = build([
      row({ Puissance_maximale: 66.6 }),
      row({ Puissance_maximale: 67.4 }),
    ]);
    expect(sameAfterRounding.cars).toHaveLength(1);
    expect(sameAfterRounding.cars[0].powerKw).toBe(67);

    const different = build([row({ Puissance_maximale: 67.4 }), row({ Puissance_maximale: 67.6 })]);
    expect(different.cars.map((car) => car.powerKw).sort()).toEqual([67, 68]);
  });

  it('the cheapest version represents the car: name, engine size, range class and consumption', () => {
    const car = build([
      row({
        Description_Commerciale: 'SANDERO Journey',
        Prix_véhicule: 16000,
        Cylindrée: 1200,
        Gamme: 'MOYENNE INFERIEURE',
        Conso_vitesse_mixte_Min: 6.0,
        Conso_vitesse_mixte_Max: 6.0,
      }),
      row({
        Description_Commerciale: 'SANDERO Essential',
        Prix_véhicule: 12500,
        Cylindrée: 999,
        Gamme: 'INFERIEURE',
        Conso_vitesse_mixte_Min: 5.5,
        Conso_vitesse_mixte_Max: 5.5,
      }),
      row({
        Description_Commerciale: 'SANDERO Expression',
        Prix_véhicule: 14000,
        Cylindrée: 1100,
        Gamme: 'ECONOMIQUE',
        Conso_vitesse_mixte_Min: 4.0,
        Conso_vitesse_mixte_Max: 4.0,
      }),
    ]).cars[0];
    expect(car).toMatchObject({
      variant: 'SANDERO Essential',
      priceEur: 12500,
      engineCc: 999,
      segment: 'B',
      fuelL100: 5.5,
    });
  });

  it('the price is the lowest price of the group, wherever that row stands in the input', () => {
    const prices = [15000, 13200, 18000, 12100, 12900];
    for (let shift = 0; shift < prices.length; shift += 1) {
      const rotated = [...prices.slice(shift), ...prices.slice(0, shift)];
      const result = build(rotated.map((price) => row({ Prix_véhicule: price })));
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0].priceEur).toBe(12100);
    }
  });

  it('equal prices: the version with the lowest fuel consumption represents the car', () => {
    const versions = [
      row({ Description_Commerciale: 'SANDERO A', Conso_vitesse_mixte_Min: 6.0, Conso_vitesse_mixte_Max: 6.0 }),
      row({ Description_Commerciale: 'SANDERO Z', Conso_vitesse_mixte_Min: 5.0, Conso_vitesse_mixte_Max: 5.0 }),
    ];
    for (const input of [versions, [...versions].reverse()]) {
      expect(build(input).cars[0]).toMatchObject({ variant: 'SANDERO Z', fuelL100: 5 });
    }
  });

  it('equal prices and fuel consumption: the lowest electricity consumption decides', () => {
    const versions = [
      plugInRow({ Description_Commerciale: 'SANDERO A', Conso_elec_Min: 200, Conso_elec_Max: 200 }),
      plugInRow({ Description_Commerciale: 'SANDERO Z', Conso_elec_Min: 150, Conso_elec_Max: 150 }),
    ];
    for (const input of [versions, [...versions].reverse()]) {
      expect(build(input).cars[0]).toMatchObject({ variant: 'SANDERO Z', electricKwh100: 15 });
    }
  });

  it('equal prices and consumption: the description that sorts first decides', () => {
    const versions = [
      row({ Description_Commerciale: 'SANDERO Journey' }),
      row({ Description_Commerciale: 'SANDERO Essential' }),
      row({ Description_Commerciale: 'SANDERO Expression' }),
    ];
    for (const input of [versions, [...versions].reverse()]) {
      expect(build(input).cars[0].variant).toBe('SANDERO Essential');
    }
  });

  it('engine size 0 or missing becomes null', () => {
    expect(only(row({ Cylindrée: 0 })).engineCc).toBeNull();
    expect(only(row({ Cylindrée: null })).engineCc).toBeNull();
  });

  it('an electric car never has an engine size', () => {
    expect(only(electricRow({ Cylindrée: 1500 })).engineCc).toBeNull();
  });
});

describe('buildCatalog - bi-fuel LPG cars', () => {
  // The same version appears twice: once in petrol mode and once in LPG mode.
  const petrolMode = lpgRow({
    Puissance_maximale: 66,
    Conso_vitesse_mixte_Min: 5.0,
    Conso_vitesse_mixte_Max: 5.6,
  });
  const lpgMode = lpgRow({
    Puissance_maximale: 74,
    Conso_vitesse_mixte_Min: 6.8,
    Conso_vitesse_mixte_Max: 7.6,
  });

  it('rows with different power form one car with the higher power and the higher consumption', () => {
    for (const input of [[petrolMode, lpgMode], [lpgMode, petrolMode]]) {
      const result = build(input);
      expect(result.cars).toHaveLength(1);
      expect(result.cars[0]).toMatchObject({
        slug: 'dacia-sandero-sedan-hatchback-lpg-manual-74kw',
        fuelType: 'lpg',
        variant: 'SANDERO ECO-G (101ch)',
        powerKw: 74,
        // LPG mode: mean of 6.8 and 7.6; petrol mode would give 5.3
        fuelL100: 7.2,
        electricKwh100: null,
        priceEur: 13000,
      });
    }
  });

  it('a dearer version with another description does not raise power or consumption', () => {
    const dearerVersion = lpgRow({
      Description_Commerciale: 'SANDERO STEPWAY ECO-G (110ch)',
      Prix_véhicule: 15000,
      Puissance_maximale: 81,
      Conso_vitesse_mixte_Min: 8.0,
      Conso_vitesse_mixte_Max: 8.0,
    });
    const result = build([dearerVersion, petrolMode, lpgMode]);
    expect(result.cars).toHaveLength(1);
    expect(result.cars[0]).toMatchObject({
      slug: 'dacia-sandero-sedan-hatchback-lpg-manual-74kw',
      variant: 'SANDERO ECO-G (101ch)',
      powerKw: 74,
      fuelL100: 7.2,
      priceEur: 13000,
    });
  });

  it('the cheapest version is the representative even when a dearer one is more powerful', () => {
    const cheapWeak = lpgRow({
      Description_Commerciale: 'SANDERO ECO-G Essential',
      Prix_véhicule: 12000,
      Puissance_maximale: 60,
      Conso_vitesse_mixte_Min: 7.0,
      Conso_vitesse_mixte_Max: 7.0,
    });
    const car = build([petrolMode, lpgMode, cheapWeak]).cars[0];
    expect(car).toMatchObject({
      variant: 'SANDERO ECO-G Essential',
      priceEur: 12000,
      powerKw: 60,
      fuelL100: 7,
    });
  });

  it('for other fuel types, rows with different power stay separate cars', () => {
    const result = build([
      row({ Puissance_maximale: 66 }),
      row({ Puissance_maximale: 74 }),
    ]);
    expect(result.cars.map((car) => car.powerKw).sort()).toEqual([66, 74]);
  });
});

describe('buildCatalog - consumption', () => {
  it('fuel consumption is the mean of the minimum and the maximum, to one decimal', () => {
    expect(only(row({ Conso_vitesse_mixte_Min: 6.656, Conso_vitesse_mixte_Max: 7.871 })).fuelL100).toBe(7.3); // 7.2635
    expect(only(row({ Conso_vitesse_mixte_Min: 5.0, Conso_vitesse_mixte_Max: 5.1 })).fuelL100).toBe(5.1); // 5.05, half up
    expect(only(row({ Conso_vitesse_mixte_Min: 5.02, Conso_vitesse_mixte_Max: 5.04 })).fuelL100).toBe(5); // 5.03
  });

  it('when one of the two values is missing, the other one is used', () => {
    expect(only(row({ Conso_vitesse_mixte_Min: null, Conso_vitesse_mixte_Max: 6.4 })).fuelL100).toBe(6.4);
    expect(only(row({ Conso_vitesse_mixte_Min: 4.8, Conso_vitesse_mixte_Max: null })).fuelL100).toBe(4.8);
    expect(only(electricRow({ Conso_elec_Min: null, Conso_elec_Max: 179 })).electricKwh100).toBe(17.9);
    expect(only(electricRow({ Conso_elec_Min: 164, Conso_elec_Max: null })).electricKwh100).toBe(16.4);
  });

  it('electricity consumption is the mean in Wh/km divided by 10, to one decimal', () => {
    // (150 + 170) / 2 = 160 Wh/km = 16.0 kWh/100 km
    expect(only(electricRow()).electricKwh100).toBe(16);
    // (133 + 148) / 2 = 140.5 Wh/km = 14.05 -> 14.1
    expect(only(electricRow({ Conso_elec_Min: 133, Conso_elec_Max: 148 })).electricKwh100).toBe(14.1);
  });

  it('a mean that ends in exactly 5 at the second decimal is rounded up: 10.6 and 11.7 give 11.2', () => {
    expect(only(row({ Conso_vitesse_mixte_Min: 10.6, Conso_vitesse_mixte_Max: 11.7 })).fuelL100).toBe(11.2);
    // 1.1 and 1.2 give 1.15 -> 1.2; 8.2 and 8.5 give 8.35 -> 8.4
    expect(only(plugInRow({ Conso_vitesse_mixte_Min: 1.1, Conso_vitesse_mixte_Max: 1.2 })).fuelL100).toBe(1.2);
    expect(only(row({ Conso_vitesse_mixte_Min: 8.2, Conso_vitesse_mixte_Max: 8.5 })).fuelL100).toBe(8.4);
  });

  it.each(['ESSENCE', 'GAZOLE', 'ESS+G.P.L.', 'ESS+ELEC HNR', 'GAZ+ELEC HNR'])(
    'a %s car has fuel consumption only, even when the row carries an electricity value',
    (energy) => {
      const car = only(row({ Energie: energy, Conso_elec_Min: 150, Conso_elec_Max: 170 }));
      expect(car.fuelL100).toBe(5.3);
      expect(car.electricKwh100).toBeNull();
    },
  );

  it('an electric car has electricity consumption only, even when the row carries a fuel value', () => {
    const car = only(electricRow({ Conso_vitesse_mixte_Min: 5, Conso_vitesse_mixte_Max: 5 }));
    expect(car.fuelL100).toBeNull();
    expect(car.electricKwh100).toBe(16);
  });

  it('a plug-in hybrid keeps both values', () => {
    const car = only(plugInRow());
    expect(car.fuelL100).toBe(1.3);
    expect(car.electricKwh100).toBe(16);
  });
});

describe('buildCatalog - price in PLN', () => {
  // listPricePln = priceEur * rate * 1.23 / 1.20, rounded to the nearest 100.
  it.each([
    [12000, 4.3, 52900], // 52 890
    [23000, 4.3, 101400], // 101 372.5
    [45600, 4.3, 201000], // 200 982
    [12000, 4.3775, 53800], // 53 843.25
    [23000, 4.3775, 103200], // 103 199.56
    [45600, 4.3775, 204600], // 204 604.35
    [5000, 4.3, 22000], // 22 037.5
    [1000000, 4.3, 4407500], // 4 407 500
  ])('%i EUR at rate %f is %i PLN', (priceEur, rate, expected) => {
    const car = only(row({ Prix_véhicule: priceEur }), rate);
    expect(car.priceEur).toBe(priceEur);
    expect(car.listPricePln).toBe(expected);
  });

  it('the date and the source address of the price come from the options', () => {
    const result = buildCatalog([row()], {
      eurPln: 4.3,
      observedAt: '2025-03-31',
      sourceUrl: 'https://example.org/another-page',
      brands: BRANDS,
    });
    expect(result.cars[0].priceObservedAt).toBe('2025-03-31');
    expect(result.cars[0].priceSourceUrl).toBe('https://example.org/another-page');
  });

  it.each([0, -4.3, -0.0001, Number.NaN])('rate %s is refused', (rate) => {
    expect(() => build([row()], rate)).toThrow(/eurPln/);
  });

  it('a refused rate throws even when there are no rows', () => {
    expect(() => build([], 0)).toThrow(/eurPln/);
  });
});

describe('buildCatalog - slugs and order', () => {
  it('the slug is make-model-body-fuel-transmission-power in lower-case ASCII with hyphens', () => {
    expect(only(row()).slug).toBe('dacia-sandero-sedan-hatchback-petrol-manual-67kw');
    expect(
      only(
        row({
          Marque: 'B.M.W.',
          Modèle: '218',
          Description_Commerciale: '218i Active Tourer',
          Carrosserie: 'MONOSPACE COMPACT',
          Type_de_boite: 'AUTOMATIQUE',
          Puissance_maximale: 100,
        }),
      ).slug,
    ).toBe('bmw-218-mpv-petrol-automatic-100kw');
  });

  it('diacritics are removed and every run of other characters becomes one hyphen', () => {
    expect(
      only(row({ Marque: 'SKODA', Modèle: 'ENYAQ  iV / 80', Description_Commerciale: 'ENYAQ iV 80' })).slug,
    ).toBe('skoda-enyaq-iv-80-sedan-hatchback-petrol-manual-67kw');
    expect(
      only(row({ Marque: 'CITROEN', Modèle: 'Ë-C4 X', Description_Commerciale: 'ë-C4 X' })).slug,
    ).toBe('citroen-e-c4-x-sedan-hatchback-petrol-manual-67kw');
    expect(
      only(row({ Marque: 'MERCEDES', Modèle: 'CLASSE_A (W177)', Description_Commerciale: 'A 180' })).slug,
    ).toBe('mercedes-benz-classe-a-w177-sedan-hatchback-petrol-manual-67kw');
  });

  it('every slug is lower-case ASCII kebab-case', () => {
    const result = build([
      row({ Marque: 'SKODA', Modèle: '  Ökö--Modèle__X!  ', Description_Commerciale: 'X' }),
      row({ Marque: 'NEW  BRAND & CO.', Modèle: '500+', Description_Commerciale: '500+' }),
      row({ Carrosserie: 'TS TERRAINS/CHEMINS' }),
    ]);
    expect(result.cars).toHaveLength(3);
    for (const car of result.cars) expect(car.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('two cars with the same slug: the cheaper keeps it, the others get -2 and -3 by rising price', () => {
    // Three different models whose names give the same slug. The price order
    // differs from the alphabetical order of the names on purpose.
    const sameSlug = [
      row({ Modèle: 'C4-X', Description_Commerciale: 'C4-X Shine', Prix_véhicule: 22000 }),
      row({ Modèle: 'C4 X', Description_Commerciale: 'C4 X Feel', Prix_véhicule: 20000 }),
      row({ Modèle: 'C4_X', Description_Commerciale: 'C4_X Max', Prix_véhicule: 18000 }),
    ];
    const expected = [
      ['dacia-c4-x-sedan-hatchback-petrol-manual-67kw', 18000, 'C4_X'],
      ['dacia-c4-x-sedan-hatchback-petrol-manual-67kw-2', 20000, 'C4 X'],
      ['dacia-c4-x-sedan-hatchback-petrol-manual-67kw-3', 22000, 'C4-X'],
    ];
    const orders = [
      sameSlug,
      [...sameSlug].reverse(),
      [sameSlug[1], sameSlug[2], sameSlug[0]],
    ];
    for (const input of orders) {
      const cars = build(input).cars;
      expect(cars.map((car) => [car.slug, car.priceEur, car.model])).toEqual(expected);
    }
  });

  it('slugs are unique for a larger mixed input', () => {
    const rows: AdemeRow[] = [];
    for (const model of ['A 1', 'A-1', 'A_1', 'A.1']) {
      for (const power of [60, 70]) {
        rows.push(row({ Modèle: model, Description_Commerciale: `${model} v`, Puissance_maximale: power, Prix_véhicule: 10000 + rows.length }));
      }
    }
    const slugs = build(rows).cars.map((car) => car.slug);
    expect(slugs).toHaveLength(8);
    expect(new Set(slugs).size).toBe(8);
  });

  it('the output is sorted by slug', () => {
    const result = build([
      row({ Marque: 'TOYOTA', Modèle: 'YARIS', Description_Commerciale: 'YARIS' }),
      row({ Marque: 'B.M.W.', Modèle: '218', Description_Commerciale: '218i' }),
      row({ Puissance_maximale: 81 }),
      row(),
      row({ Marque: 'KIA', Modèle: 'CEED', Description_Commerciale: 'CEED' }),
    ]);
    expect(result.cars.map((car) => car.slug)).toEqual([
      'bmw-218-sedan-hatchback-petrol-manual-67kw',
      'dacia-sandero-sedan-hatchback-petrol-manual-67kw',
      'dacia-sandero-sedan-hatchback-petrol-manual-81kw',
      'kia-ceed-sedan-hatchback-petrol-manual-67kw',
      'toyota-yaris-sedan-hatchback-petrol-manual-67kw',
    ]);
  });

  it('the same rows give the same result, whatever their order', () => {
    const rows = [
      row(),
      row({ Description_Commerciale: 'SANDERO Essential', Prix_véhicule: 11000 }),
      row({ Puissance_maximale: 81 }),
      row({ Modèle: 'C4 X', Description_Commerciale: 'C4 X' }),
      row({ Modèle: 'C4-X', Description_Commerciale: 'C4-X' }),
      lpgRow({ Puissance_maximale: 66 }),
      lpgRow({ Puissance_maximale: 74, Conso_vitesse_mixte_Min: 7, Conso_vitesse_mixte_Max: 7 }),
      electricRow(),
      plugInRow({ Marque: 'TOYOTA', Modèle: 'PRIUS', Description_Commerciale: 'PRIUS' }),
      row({ Prix_véhicule: null }),
      row({ Marque: 'UNKNOWN MAKE', Modèle: 'ONE', Description_Commerciale: 'ONE' }),
    ];
    const first = build(rows);
    expect(first.cars).toHaveLength(8);
    expect(build(rows)).toEqual(first);
    expect(build([...rows].reverse())).toEqual(first);
    const interleaved = [...rows.filter((_, i) => i % 2 === 1), ...rows.filter((_, i) => i % 2 === 0)];
    expect(build(interleaved)).toEqual(first);
  });

  it('the input rows are left untouched', () => {
    const rows = [row({ Marque: ' DACIA ', Description_Commerciale: 'CoupÃ©  Sport' })];
    const copy = JSON.parse(JSON.stringify(rows));
    build(rows);
    expect(rows).toEqual(copy);
  });
});

describe('buildCatalog - text clean-up', () => {
  it('repairs text whose encoding was broken: CoupÃ© becomes Coupé', () => {
    expect(only(row({ Description_Commerciale: 'SANDERO CoupÃ©' })).variant).toBe('SANDERO Coupé');
  });

  it('repairs a broken "à" whose second byte became a plain space', () => {
    // As in the dataset: the marker, the space that was the second byte, then the real space.
    expect(only(row({ Description_Commerciale: "SANDERO pn de 17'' Ã  19''" })).variant).toBe(
      "SANDERO pn de 17'' à 19''",
    );
  });

  it('repairs a marker at the very end of a text, where its space was trimmed away', () => {
    expect(only(row({ Description_Commerciale: 'SANDERO ENGAGEÂ Â Â' })).variant).toBe('SANDERO ENGAGE');
  });

  it('repairs a broken no-break space into a normal space', () => {
    expect(only(row({ Description_Commerciale: 'SANDERO BVMÂ N-CONNECTA' })).variant).toBe(
      'SANDERO BVM N-CONNECTA',
    );
  });

  it('repairs broken encoding in the model as well', () => {
    const car = only(row({ Modèle: 'MÃ©GANE', Description_Commerciale: 'MÃ©GANE Techno' }));
    expect(car.model).toBe('MéGANE');
    expect(car.variant).toBe('MéGANE Techno');
    expect(car.slug).toBe('dacia-megane-sedan-hatchback-petrol-manual-67kw');
  });

  it('leaves correctly encoded accented text alone', () => {
    expect(only(row({ Description_Commerciale: 'SANDERO Coupé Élégance à 5 portes' })).variant).toBe(
      'SANDERO Coupé Élégance à 5 portes',
    );
  });

  it('trims strings and collapses repeated spaces', () => {
    const car = only(
      row({
        Marque: '  DACIA ',
        Modèle: ' SANDERO  ',
        Description_Commerciale: '   SANDERO    (91ch)  TCe ',
      }),
    );
    expect(car.make).toBe('Dacia');
    expect(car.model).toBe('SANDERO');
    expect(car.variant).toBe('SANDERO (91ch) TCe');
    expect(car.brandTier).toBe('budget');
  });

  it('rows that differ only in surrounding spaces belong to the same car', () => {
    const result = build([row(), row({ Marque: ' DACIA', Modèle: 'SANDERO ', Prix_véhicule: 11000 })]);
    expect(result.cars).toHaveLength(1);
    expect(result.cars[0].priceEur).toBe(11000);
    expect(result.unknownMakes).toEqual([]);
  });
});

describe('buildCatalog - makes', () => {
  it('a known make gets its display name, tier and value retention from the brand data', () => {
    expect(only(row({ Marque: 'B.M.W.', Modèle: '218', Description_Commerciale: '218i' }))).toMatchObject({
      make: 'BMW',
      brandTier: 'premium',
      valueRetention: 'average',
    });
    expect(only(row({ Marque: 'CITROEN', Modèle: 'C3', Description_Commerciale: 'C3' }))).toMatchObject({
      make: 'Citroën',
      brandTier: 'mainstream',
      valueRetention: 'low',
    });
  });

  it('an unknown make gets a title-cased name, mainstream, average, and is listed', () => {
    const result = build([row({ Marque: 'NEW BRAND', Modèle: 'ONE', Description_Commerciale: 'ONE' })]);
    expect(result.cars[0]).toMatchObject({
      make: 'New Brand',
      brandTier: 'mainstream',
      valueRetention: 'average',
      slug: 'new-brand-one-sedan-hatchback-petrol-manual-67kw',
    });
    expect(result.unknownMakes).toEqual(['NEW BRAND']);
  });

  it('title-casing also capitalises after a hyphen', () => {
    const car = build([row({ Marque: 'ROLLS-ROYCE', Modèle: 'GHOST', Description_Commerciale: 'GHOST' })]).cars[0];
    expect(car.make).toBe('Rolls-Royce');
  });

  it('unknown makes are listed once each, sorted, and known makes are not listed', () => {
    const result = build([
      row({ Marque: 'ZEEKR', Modèle: 'X', Description_Commerciale: 'X' }),
      row(),
      row({ Marque: 'AIWAYS', Modèle: 'U5', Description_Commerciale: 'U5' }),
      row({ Marque: 'ZEEKR', Modèle: '7X', Description_Commerciale: '7X' }),
    ]);
    expect(result.unknownMakes).toEqual(['AIWAYS', 'ZEEKR']);
  });

  it('the make is looked up exactly: another letter case is an unknown make', () => {
    const result = build([row({ Marque: 'Dacia' })]);
    expect(result.unknownMakes).toEqual(['Dacia']);
    expect(result.cars[0].brandTier).toBe('mainstream');
  });

  it('a make named like a built-in object property is an unknown make', () => {
    const result = build([row({ Marque: 'constructor', Modèle: 'ONE', Description_Commerciale: 'ONE' })]);
    expect(result.unknownMakes).toEqual(['constructor']);
    expect(result.cars[0]).toMatchObject({ make: 'Constructor', brandTier: 'mainstream' });
  });
});

describe('buildCatalog - power of electric cars', () => {
  // Power = the highest of: maximum power, horsepower in the description * 0.7355,
  // kilowatts in the description, rated electric power.
  it.each([
    ['e-Soul Moteur électrique (204ch)', 29, 150], // 204 * 0.7355 = 150.04
    ['EV6 Moteur électrique 239kW (325ch)', 81, 239], // 325 * 0.7355 = 239.04
    ['MODEL 3 (88Kw)', 88, 88],
    ['LEAF 62kWh', 90, 90],
    ['SPRING (19Kw)', 18.6, 19],
  ])('"%s" with rated power %f has %i kW', (description, rated, expected) => {
    const car = only(
      electricRow({ Description_Commerciale: description, Puissance_nominale_électrique: rated }),
    );
    expect(car.powerKw).toBe(expected);
    expect(car.slug.endsWith(`-${expected}kw`)).toBe(true);
  });

  it('horsepower in the description is converted with 0.7355', () => {
    // 136 * 0.7355 = 100.03; 300 * 0.7355 = 220.65
    expect(only(electricRow({ Description_Commerciale: 'EV (136ch)', Puissance_nominale_électrique: 50 })).powerKw).toBe(100);
    expect(only(electricRow({ Description_Commerciale: 'EV 300 ch', Puissance_nominale_électrique: 50 })).powerKw).toBe(221);
    expect(only(electricRow({ Description_Commerciale: 'EV 300CH', Puissance_nominale_électrique: 50 })).powerKw).toBe(221);
  });

  it('kilowatts in the description are read with or without a space, in any letter case', () => {
    expect(only(electricRow({ Description_Commerciale: 'EV 160 kW', Puissance_nominale_électrique: 50 })).powerKw).toBe(160);
    expect(only(electricRow({ Description_Commerciale: 'EV (57Kw)', Puissance_nominale_électrique: 40 })).powerKw).toBe(57);
    expect(only(electricRow({ Description_Commerciale: 'EV 150KW', Puissance_nominale_électrique: 40 })).powerKw).toBe(150);
  });

  it('a battery size in kWh is not read as power', () => {
    expect(only(electricRow({ Description_Commerciale: 'LEAF 62kWh', Puissance_nominale_électrique: 40 })).powerKw).toBe(40);
    expect(only(electricRow({ Description_Commerciale: 'ZOE 52 kWh', Puissance_nominale_électrique: 40 })).powerKw).toBe(40);
    expect(only(electricRow({ Description_Commerciale: 'ZOE 23.8 kWh', Puissance_nominale_électrique: 40 })).powerKw).toBe(40);
    expect(only(electricRow({ Description_Commerciale: 'ARIYA 63KWH ENGAGE', Puissance_nominale_électrique: 40 })).powerKw).toBe(40);
  });

  it('a battery size and a power figure in the same description: only the power counts', () => {
    expect(
      only(electricRow({ Description_Commerciale: 'ARIYA 87kWh 178kW', Puissance_nominale_électrique: 60 })).powerKw,
    ).toBe(178);
  });

  it('when a figure occurs several times, the highest one is used', () => {
    // 150 ch = 110.3 kW
    expect(only(electricRow({ Description_Commerciale: 'EV (100ch) (150ch)', Puissance_nominale_électrique: 30 })).powerKw).toBe(110);
    expect(only(electricRow({ Description_Commerciale: 'EV 80kW 120kW 100kW', Puissance_nominale_électrique: 30 })).powerKw).toBe(120);
  });

  it('the rated power is used when it is the highest value', () => {
    // 100 ch = 73.55 kW
    expect(only(electricRow({ Description_Commerciale: 'EV (100ch)', Puissance_nominale_électrique: 95 })).powerKw).toBe(95);
  });

  it('the maximum power is used when an electric row has one and it is the highest', () => {
    expect(
      only(electricRow({ Description_Commerciale: 'EV (100ch)', Puissance_maximale: 200, Puissance_nominale_électrique: 60 })).powerKw,
    ).toBe(200);
  });

  it('the maximum power does not win when another value is higher', () => {
    expect(
      only(electricRow({ Description_Commerciale: 'EV 250kW', Puissance_maximale: 200, Puissance_nominale_électrique: 60 })).powerKw,
    ).toBe(250);
  });

  it('an electric row with no power value at all is skipped as no-power', () => {
    expectSkipped(
      electricRow({ Description_Commerciale: 'EV Standard', Puissance_maximale: null, Puissance_nominale_électrique: null }),
      'no-power',
    );
    expectSkipped(
      electricRow({ Description_Commerciale: 'LEAF 62kWh', Puissance_maximale: null, Puissance_nominale_électrique: null }),
      'no-power',
    );
  });

  it('electric power below 15 kW or above 1200 kW is skipped as no-power', () => {
    expectSkipped(electricRow({ Puissance_nominale_électrique: 14 }), 'no-power');
    expectSkipped(electricRow({ Puissance_nominale_électrique: 1201 }), 'no-power');
  });

  it('electric power of exactly 15 kW and exactly 1200 kW is accepted', () => {
    expect(only(electricRow({ Puissance_nominale_électrique: 15 })).powerKw).toBe(15);
    expect(only(electricRow({ Puissance_nominale_électrique: 1200 })).powerKw).toBe(1200);
  });

  it('a combustion row without maximum power is skipped even when its description names a horsepower figure', () => {
    expectSkipped(row({ Description_Commerciale: 'SANDERO (130ch)', Puissance_maximale: null }), 'no-power');
    expectSkipped(
      row({ Description_Commerciale: 'SANDERO 96kW', Puissance_maximale: null, Puissance_nominale_électrique: 96 }),
      'no-power',
    );
  });

  it('a combustion row takes its maximum power and ignores the description', () => {
    expect(only(row({ Description_Commerciale: 'SANDERO (130ch)', Puissance_maximale: 67 })).powerKw).toBe(67);
  });

  it('a plug-in hybrid is not an electric row: it needs the maximum power', () => {
    expectSkipped(
      plugInRow({ Description_Commerciale: 'SANDERO (200ch)', Puissance_maximale: null, Puissance_nominale_électrique: 80 }),
      'no-power',
    );
  });

  it('electric rows with the same rounded power are one car, with different power separate cars', () => {
    const result = build([
      electricRow({ Description_Commerciale: 'EV6 (229ch)', Prix_véhicule: 45000 }), // 168.4 -> 168
      electricRow({ Description_Commerciale: 'EV6 168kW Long Range', Prix_véhicule: 47000 }),
      electricRow({ Description_Commerciale: 'EV6 239kW (325ch)', Prix_véhicule: 55000 }),
    ]);
    expect(result.cars.map((car) => [car.powerKw, car.priceEur])).toEqual([
      [168, 45000],
      [239, 55000],
    ]);
  });
});

describe('displayVariant - the name shown after the make', () => {
  it.each([
    // make, dataset make, model, description, expected
    ['Toyota', 'TOYOTA', 'C-HR', 'Toyota C-HR Hybride 140', 'C-HR Hybride 140'],
    ['MINI', 'MINI', 'MINI', 'MINI Cooper SE Hatch 3P (F56)', 'Cooper SE Hatch 3P (F56)'],
    ['Nissan', 'NISSAN', 'ARIYA', '63kWh ENGAGE', 'ARIYA 63kWh ENGAGE'],
    ['BMW', 'B.M.W.', '218', '218i Active Tourer', '218i Active Tourer'],
    ['Mercedes-Benz', 'MERCEDES', 'E 200', 'E 220 d', 'E 220 d'],
    ['Mercedes-Benz', 'MERCEDES', 'E 53 AMG', 'AMG E 53 4MATIC+', 'AMG E 53 4MATIC+'],
    ['Dacia', 'DACIA', 'SANDERO', 'SANDERO (91ch)', 'SANDERO (91ch)'],
  ])('%s / %s / %s / "%s" -> "%s"', (make, marque, model, description, expected) => {
    expect(displayVariant(make, marque, model, description)).toBe(expected);
  });

  it('removes a leading make written in another letter case', () => {
    expect(displayVariant('Toyota', 'TOYOTA', 'YARIS', 'TOYOTA YARIS Hybride')).toBe('YARIS Hybride');
    expect(displayVariant('Toyota', 'TOYOTA', 'YARIS', 'toyota YARIS Hybride')).toBe('YARIS Hybride');
  });

  it('removes a leading dataset make that differs from the display name', () => {
    expect(displayVariant('Mercedes-Benz', 'MERCEDES', 'CLA', 'MERCEDES CLA 200')).toBe('CLA 200');
    expect(displayVariant('BMW', 'B.M.W.', 'X1', 'B.M.W. X1 sDrive18i')).toBe('X1 sDrive18i');
    expect(displayVariant('Mercedes-Benz', 'MERCEDES', 'CLA', 'Mercedes-Benz CLA 200')).toBe('CLA 200');
  });

  it('removes the make only at the start and only when a space follows it', () => {
    expect(displayVariant('MINI', 'MINI', 'COOPER', 'MINIMALIST COOPER')).toBe('MINIMALIST COOPER');
    expect(displayVariant('Toyota', 'TOYOTA', 'YARIS', 'YARIS by Toyota Gazoo')).toBe('YARIS by Toyota Gazoo');
  });

  it('removes the make once per spelling (display name, then dataset make), not every repetition', () => {
    expect(displayVariant('Toyota', 'TOYOTA', 'YARIS', 'Toyota Toyota Toyota YARIS')).toBe('Toyota YARIS');
  });

  it('adds the model when the name does not contain it', () => {
    expect(displayVariant('Jeep', 'JEEP', 'AVENGER', '1.2 Turbo 100 Altitude')).toBe('AVENGER 1.2 Turbo 100 Altitude');
    expect(displayVariant('Subaru', 'SUBARU', 'OUTBACK', '2.5i Lineartronic')).toBe('OUTBACK 2.5i Lineartronic');
  });

  it('does not add the model when the name contains it in another spelling', () => {
    // Compared without accents, letter case, spaces and punctuation.
    expect(displayVariant('Toyota', 'TOYOTA', 'C-HR', 'CHR Hybride')).toBe('CHR Hybride');
    expect(displayVariant('Renault', 'RENAULT', 'MEGANE', 'Mégane E-Tech')).toBe('Mégane E-Tech');
    expect(displayVariant('Kia', 'KIA', 'E-SOUL', 'e-Soul Moteur électrique (204ch)')).toBe(
      'e-Soul Moteur électrique (204ch)',
    );
    expect(displayVariant('Tesla', 'TESLA', 'MODEL 3', 'MODEL3 Grande Autonomie')).toBe('MODEL3 Grande Autonomie');
  });

  it('does not add the model when the make already contains it', () => {
    expect(displayVariant('MINI', 'MINI', 'MINI', 'Cooper SE')).toBe('Cooper SE');
  });

  it('does not add the model when its first word is already a word of the name', () => {
    expect(displayVariant('Mercedes-Benz', 'MERCEDES', 'C 180', 'C 200 d Break')).toBe('C 200 d Break');
    expect(displayVariant('Mercedes-Benz', 'MERCEDES', 'GLC 300', 'Coupé GLC 220 d')).toBe('Coupé GLC 220 d');
  });

  it('adds the model when its first word appears only inside another word', () => {
    expect(displayVariant('Mercedes-Benz', 'MERCEDES', 'E 200', 'Break Elegance')).toBe('E 200 Break Elegance');
  });

  it('falls back to the model when nothing is left of the description', () => {
    expect(displayVariant('Toyota', 'TOYOTA', 'YARIS', '')).toBe('YARIS');
  });
});

describe('buildCatalog - display names', () => {
  it('the car name is the cleaned description without the leading make', () => {
    const car = only(
      row({ Marque: 'TOYOTA', Modèle: 'C-HR', Description_Commerciale: '  Toyota   C-HR Hybride 140 ' }),
    );
    expect(car.make).toBe('Toyota');
    expect(car.variant).toBe('C-HR Hybride 140');
  });

  it('the car name gets the model in front when the description lacks it', () => {
    const car = only(
      electricRow({ Marque: 'NISSAN', Modèle: 'ARIYA', Description_Commerciale: '63kWh ENGAGE' }),
    );
    expect(car.variant).toBe('ARIYA 63kWh ENGAGE');
    expect(car.model).toBe('ARIYA');
  });

  it('model codes of the same family are not added: E 200 with E 220 d stays E 220 d', () => {
    const car = only(row({ Marque: 'MERCEDES', Modèle: 'E 200', Description_Commerciale: 'E 220 d' }));
    expect(car.make).toBe('Mercedes-Benz');
    expect(car.variant).toBe('E 220 d');
  });

  it('for an unknown make the title-cased name is removed from the front as well', () => {
    const car = build([row({ Marque: 'NEW BRAND', Modèle: 'ONE', Description_Commerciale: 'NEW BRAND ONE Sport' })]).cars[0];
    expect(car.variant).toBe('ONE Sport');
  });
});

describe('ademeRowSchema', () => {
  const complete = {
    Marque: 'DACIA',
    Modèle: 'SANDERO',
    Description_Commerciale: 'SANDERO (91ch)',
    Energie: 'ESSENCE',
    Carrosserie: 'BERLINE',
    Gamme: 'INFERIEURE',
    Cylindrée: 999,
    Puissance_maximale: 67,
    Puissance_nominale_électrique: null,
    Type_de_boite: 'MECANIQUE',
    Conso_vitesse_mixte_Min: 5.0,
    Conso_vitesse_mixte_Max: 5.6,
    Conso_elec_Min: null,
    Conso_elec_Max: null,
    Prix_véhicule: 12000,
  };
  const without = (...keys: string[]) =>
    Object.fromEntries(Object.entries(complete).filter(([key]) => !keys.includes(key)));

  it('accepts a complete row unchanged', () => {
    expect(ademeRowSchema.parse(complete)).toEqual(complete);
  });

  it('gives null for every number field that is absent', () => {
    const parsed = ademeRowSchema.parse(
      without(
        'Cylindrée',
        'Puissance_maximale',
        'Puissance_nominale_électrique',
        'Conso_vitesse_mixte_Min',
        'Conso_vitesse_mixte_Max',
        'Conso_elec_Min',
        'Conso_elec_Max',
        'Prix_véhicule',
      ),
    );
    expect(parsed).toEqual({
      ...complete,
      Cylindrée: null,
      Puissance_maximale: null,
      Puissance_nominale_électrique: null,
      Conso_vitesse_mixte_Min: null,
      Conso_vitesse_mixte_Max: null,
      Conso_elec_Min: null,
      Conso_elec_Max: null,
      Prix_véhicule: null,
    });
  });

  it.each(['Marque', 'Modèle', 'Description_Commerciale', 'Energie', 'Carrosserie', 'Gamme', 'Type_de_boite'])(
    'rejects a row without %s',
    (key) => {
      expect(ademeRowSchema.safeParse(without(key)).success).toBe(false);
    },
  );

  it('rejects a text field that holds a number and a number field that holds text', () => {
    expect(ademeRowSchema.safeParse({ ...complete, Marque: 12 }).success).toBe(false);
    expect(ademeRowSchema.safeParse({ ...complete, Marque: null }).success).toBe(false);
    expect(ademeRowSchema.safeParse({ ...complete, Prix_véhicule: '12000' }).success).toBe(false);
  });

  it('rejects values that are not a row', () => {
    expect(ademeRowSchema.safeParse(null).success).toBe(false);
    expect(ademeRowSchema.safeParse('row').success).toBe(false);
    expect(ademeRowSchema.safeParse([]).success).toBe(false);
  });

  it('drops fields it does not know', () => {
    expect(ademeRowSchema.parse({ ...complete, _score: null, Couleur: 'rouge' })).toEqual(complete);
  });
});
