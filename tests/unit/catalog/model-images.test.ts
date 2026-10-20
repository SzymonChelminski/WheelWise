import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CarPhotoData } from '@/components/ui/CarPhoto';
import { toSlug } from '@/lib/catalog';
import { getModelImage, modelKey } from '@/lib/catalog/model-images';
import type { CarInput } from '@/lib/domain/types';

// The committed photo list (one entry per model of the catalogue) and its lookup. The file is read
// from disk here, so the order of its keys and the exact values are checked as they are stored.

function readData(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), 'data', relativePath), 'utf8');
}

const rawImages = readData('model-images.json');
const images = JSON.parse(rawImages) as Record<string, CarPhotoData | null>;
const cars = JSON.parse(readData('fixtures/cars.json')) as CarInput[];
const entries = Object.entries(images);
const photos = entries.filter((entry): entry is [string, CarPhotoData] => entry[1] !== null);

const LICENCE_ALLOW_LIST = [/^CC0( 1\.0)?$/, /^Public domain$/i, /^PD(-\S+)?$/, /^CC BY \d/, /^CC BY-SA \d/];

describe('modelKey', () => {
  it('is the make and the model as slugs, joined with a slash', () => {
    expect(modelKey({ make: 'Renault', model: 'CLIO' })).toBe('renault/clio');
    expect(modelKey({ make: 'Alfa Romeo', model: 'GIULIA' })).toBe('alfa-romeo/giulia');
    expect(modelKey({ make: 'Škoda', model: 'ENYAQ  iV / 80' })).toBe('skoda/enyaq-iv-80');
    expect(modelKey({ make: 'Citroën', model: 'Ë-C4 X' })).toBe('citroen/e-c4-x');
    expect(modelKey({ make: 'Mercedes-Benz', model: 'CLASSE_A (W177)' })).toBe('mercedes-benz/classe-a-w177');
  });

  it('uses the slug function of the catalogue builder for every car of the catalogue', () => {
    const wrong = cars.filter((car) => modelKey(car) !== `${toSlug(car.make)}/${toSlug(car.model)}`);
    expect(wrong.map((car) => car.slug)).toEqual([]);
  });
});

describe('getModelImage - committed photo list', () => {
  it('returns the entry of a known model: the Renault Clio', () => {
    const clio = cars.find((car) => car.slug === 'renault-clio-diesel-manual-101km');
    expect(clio).toBeDefined();
    const photo = getModelImage(clio as CarInput);
    expect(photo).not.toBeNull();
    expect(photo).toEqual(images['renault/clio']);
  });

  it('looks the photo up by make and model only, in any letter case and with or without accents', () => {
    const expected = images['renault/clio'];
    expect(getModelImage({ make: 'Renault', model: 'CLIO' })).toEqual(expected);
    expect(getModelImage({ make: 'RENAULT', model: 'Clio' })).toEqual(expected);
    expect(getModelImage({ make: 'Škoda', model: 'OCTAVIA' })).toEqual(images['skoda/octavia']);
  });

  it('every car of the catalogue gets the entry of its model', () => {
    for (const car of cars) {
      expect(getModelImage(car), car.slug).toEqual(images[modelKey(car)]);
    }
  });

  it('a model missing from the list has no photo', () => {
    expect(getModelImage({ make: 'Nowa Marka', model: 'X1' })).toBeNull();
    expect(getModelImage({ make: 'Renault', model: 'CLIO NEXT' })).toBeNull();
    expect(getModelImage({ make: '', model: '' })).toBeNull();
  });

  it('a key named like a built-in object property is not a photo', () => {
    expect(getModelImage({ make: 'constructor', model: 'prototype' })).toBeNull();
    expect(getModelImage({ make: 'hasOwnProperty', model: '' })).toBeNull();
  });
});

describe('committed photo list - data/model-images.json', () => {
  it('has exactly one entry for every model of the catalogue', () => {
    const catalogueKeys = [...new Set(cars.map((car) => modelKey(car)))].sort();
    expect(Object.keys(images).sort()).toEqual(catalogueKeys);
  });

  it('keys are sorted', () => {
    const keys = Object.keys(images);
    expect(keys).toEqual([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it('is stored with LF line endings', () => {
    expect(rawImages.includes('\r\n')).toBe(false);
  });

  it('every photo has exactly the thumbnails 500, 960 and 1280 px, on upload.wikimedia.org', () => {
    expect(photos.length).toBeGreaterThan(0);
    for (const [key, photo] of photos) {
      expect(photo.sources.map((source) => source.width).sort((a, b) => a - b), key).toEqual([500, 960, 1280]);
      for (const source of photo.sources) {
        const url = new URL(source.url);
        expect(source.url.startsWith('https://upload.wikimedia.org/'), `${key}: ${source.url}`).toBe(true);
        expect(url.protocol, key).toBe('https:');
        expect(url.host, key).toBe('upload.wikimedia.org');
        expect(url.pathname, key).toContain(`/${source.width}px-`);
      }
    }
  });

  it('every licence is in the allow-list: CC0, public domain, CC BY or CC BY-SA', () => {
    const refused = photos.filter(([, photo]) => !LICENCE_ALLOW_LIST.some((pattern) => pattern.test(photo.license)));
    expect(refused.map(([key, photo]) => `${key}: ${photo.license}`)).toEqual([]);
    const nonFree = photos.filter(([, photo]) => /\b(NC|ND)\b|non-?free|fair use/i.test(photo.license));
    expect(nonFree.map(([key]) => key)).toEqual([]);
  });

  it('every source page is a file page on commons.wikimedia.org', () => {
    for (const [key, photo] of photos) {
      const url = new URL(photo.sourceUrl);
      expect(url.protocol, key).toBe('https:');
      expect(url.host, key).toBe('commons.wikimedia.org');
      expect(url.pathname.startsWith('/wiki/File:'), `${key}: ${photo.sourceUrl}`).toBe(true);
    }
  });

  it('every author is plain text of 1 to 120 characters', () => {
    for (const [key, photo] of photos) {
      expect(photo.author.length, key).toBeGreaterThanOrEqual(1);
      expect(photo.author.length, key).toBeLessThanOrEqual(120);
      expect(photo.author, key).toBe(photo.author.trim());
      expect(photo.author, key).not.toMatch(/<[a-z/!]|\s{2,}/i);
    }
  });

  it('every licence link is null or a web address, and every original size is a positive whole number', () => {
    for (const [key, photo] of photos) {
      if (photo.licenseUrl !== null) expect(['http:', 'https:'], key).toContain(new URL(photo.licenseUrl).protocol);
      expect(Number.isInteger(photo.width) && photo.width > 0, key).toBe(true);
      expect(Number.isInteger(photo.height) && photo.height > 0, key).toBe(true);
    }
  });
});
