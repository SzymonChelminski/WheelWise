import { useCallback, useSyncExternalStore } from 'react';
import { z } from 'zod';

/*
 * The cars chosen for comparison. They live in localStorage, so the choice
 * survives a reload, and every component and every tab sees the same list.
 */
export const COMPARE_STORAGE_KEY = 'wheelwise.compare.v1';
export const COMPARE_LIMIT = 3;

const storedSchema = z.array(z.string().min(1).max(200));

const EMPTY: readonly string[] = [];

let cachedRaw: string | null = null;
let cachedSlugs: readonly string[] = EMPTY;
// Used when localStorage is unavailable (blocked, private mode): the choice then lasts until the page is closed.
let memoryOnly = false;
let limitNotice = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function parse(raw: string | null): readonly string[] {
  if (raw === null) return EMPTY;
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return EMPTY;
    // A car counts once, whatever the stored list says; the limit applies to the cars left.
    const slugs = [...new Set(parsed.data)];
    return slugs.length > 0 && slugs.length <= COMPARE_LIMIT ? slugs : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readSnapshot(): readonly string[] {
  if (memoryOnly) return cachedSlugs;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
  } catch {
    memoryOnly = true;
    return cachedSlugs;
  }
  // The same raw text gives the same array, as useSyncExternalStore requires.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSlugs = parse(raw);
  }
  return cachedSlugs;
}

function write(slugs: readonly string[]): void {
  limitNotice = false;
  cachedSlugs = slugs.length > 0 ? slugs : EMPTY;
  try {
    const raw = slugs.length > 0 ? JSON.stringify(slugs) : null;
    if (raw === null) window.localStorage.removeItem(COMPARE_STORAGE_KEY);
    else window.localStorage.setItem(COMPARE_STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch {
    memoryOnly = true;
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === COMPARE_STORAGE_KEY || event.key === null) {
      limitNotice = false;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getServerSnapshot = (): readonly string[] => EMPTY;
const getLimitNotice = (): boolean => limitNotice;
const getServerLimitNotice = (): boolean => false;

export function useCompare() {
  const slugs = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  const limitReached = useSyncExternalStore(subscribe, getLimitNotice, getServerLimitNotice);

  /** Adds a car. Returns false, and raises the limit message, when three cars are already chosen. */
  const add = useCallback((slug: string): boolean => {
    const current = readSnapshot();
    if (current.includes(slug)) return true;
    if (current.length >= COMPARE_LIMIT) {
      limitNotice = true;
      emit();
      return false;
    }
    write([...current, slug]);
    return true;
  }, []);

  const remove = useCallback((slug: string) => {
    write(readSnapshot().filter((item) => item !== slug));
  }, []);

  const clear = useCallback(() => write([]), []);

  const dismissLimitNotice = useCallback(() => {
    if (!limitNotice) return;
    limitNotice = false;
    emit();
  }, []);

  return {
    slugs,
    add,
    remove,
    clear,
    isFull: slugs.length >= COMPARE_LIMIT,
    limitReached,
    dismissLimitNotice,
  };
}
