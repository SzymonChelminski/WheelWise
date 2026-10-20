import { describe, expect, it, vi } from 'vitest';
import { getModelImage, modelKey } from '@/lib/catalog/model-images';

// The lookup against a small photo list of its own: one model with a photo, one model marked as
// having no photo on purpose (null), and models that are not in the list at all.

vi.mock('../../../data/model-images.json', () => ({
  default: {
    'dacia/spring': null,
    'renault/clio': {
      sources: [
        { width: 500, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/500px-Clio.jpg' },
        { width: 960, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/960px-Clio.jpg' },
        { width: 1280, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/1280px-Clio.jpg' },
      ],
      width: 3000,
      height: 2000,
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Clio.jpg',
    },
    'skoda/enyaq-iv-80': {
      sources: [
        { width: 500, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Enyaq.jpg/500px-Enyaq.jpg' },
        { width: 960, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Enyaq.jpg/960px-Enyaq.jpg' },
        { width: 1280, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Enyaq.jpg/1280px-Enyaq.jpg' },
      ],
      width: 2400,
      height: 1600,
      author: 'Another Author',
      license: 'CC0',
      licenseUrl: null,
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Enyaq.jpg',
    },
  },
}));

describe('getModelImage - lookup rules', () => {
  it('returns the entry of a model in the list', () => {
    expect(getModelImage({ make: 'Renault', model: 'CLIO' })).toEqual({
      sources: [
        { width: 500, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/500px-Clio.jpg' },
        { width: 960, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/960px-Clio.jpg' },
        { width: 1280, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Clio.jpg/1280px-Clio.jpg' },
      ],
      width: 3000,
      height: 2000,
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Clio.jpg',
    });
  });

  it('a model whose entry is null has no photo', () => {
    expect(getModelImage({ make: 'Dacia', model: 'SPRING' })).toBeNull();
  });

  it('a model missing from the list has no photo', () => {
    expect(getModelImage({ make: 'Renault', model: 'MEGANE' })).toBeNull();
    expect(getModelImage({ make: 'Dacia', model: 'SANDERO' })).toBeNull();
  });

  it('builds the key with the slug function: diacritics, spaces and punctuation are folded', () => {
    expect(modelKey({ make: 'Škoda', model: 'ENYAQ  iV / 80' })).toBe('skoda/enyaq-iv-80');
    expect(getModelImage({ make: 'Škoda', model: 'ENYAQ  iV / 80' })).toMatchObject({
      author: 'Another Author',
      license: 'CC0',
      licenseUrl: null,
    });
    expect(getModelImage({ make: 'SKODA', model: 'Enyaq iV-80' })).toMatchObject({ author: 'Another Author' });
  });

  it('the make and the model must both match', () => {
    expect(getModelImage({ make: 'Dacia', model: 'CLIO' })).toBeNull();
    expect(getModelImage({ make: 'Renault', model: 'SPRING' })).toBeNull();
  });
});
