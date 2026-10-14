import { useSearchParams } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { withQuery } from './assumption-params';

/*
 * The intended query of the current page: the query string of the most recently
 * requested navigation on this path, whether the router has applied it or not.
 *
 * A navigation that is still loading is invisible to window.location and to the
 * URL the page was rendered for. Everything that changes the query on the same
 * path therefore works on this one value:
 *   - a control writes by applying a pure function to it (useQueryWriter),
 *   - a link gets its href as a pure function of it (see link-target.ts),
 *   - a plain click on a link to the same path makes the link's query the intended one,
 *   - the controls display it.
 * It is read from the browser again only when the history buttons are used and when
 * the path changes. The last navigation the router starts replaces the ones before it,
 * so once the router is idle the address bar shows the intended query.
 */

/** Query string as URLSearchParams writes it, so equal queries are equal strings. */
function normalise(search: string): string {
  return new URLSearchParams(search).toString();
}

function browserQuery(): string {
  return normalise(window.location.search);
}

let intended: string | null = null;
// Raised whenever the intended query is set by anything but the debounced write of typed
// text; text typed but not yet written is dropped then (see use-draft.ts).
let epoch = 0;
// A same-path navigation that adds a history entry was requested and the address bar does not
// show it yet. A write must not replace it, or the entry would be lost.
let pushPending = false;
// The click handler sets the query before the click reaches the link; subscribers hear
// about it after the click has been dispatched (see watchNavigation).
let unannounced = false;
const listeners = new Set<() => void>();

export function readIntendedQuery(): string {
  intended ??= browserQuery();
  return intended;
}

function emit(): void {
  unannounced = false;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Makes `next` the intended query. `pushed`: the navigation to it adds a history entry.
 * `keepDrafts`: the change is the write of typed text, so the text stays in its field.
 */
function set(next: string, { pushed, keepDrafts }: { pushed: boolean; keepDrafts: boolean }): void {
  intended = next;
  pushPending = pushed && next !== browserQuery();
  if (!keepDrafts) epoch += 1;
}

/** Called when the path changes and on the history buttons: the intended query is the one the browser shows. */
export function resyncIntendedQuery(): void {
  intended = browserQuery();
  pushPending = false;
  epoch += 1;
  emit();
}

/** The page the router has applied shows `committed`; a pending history entry is in place once it is the intended query. */
export function noteCommittedQuery(committed: string): void {
  if (committed === intended) pushPending = false;
}

/** A plain primary click: no modifier key, left button, not already handled. */
export function isPlainPrimaryClick(
  event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>,
): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

/** The link a plain click on `target` follows in this tab, or null. */
function followedLink(event: MouseEvent): HTMLAnchorElement | null {
  if (!isPlainPrimaryClick(event) || !(event.target instanceof Element)) return null;
  const anchor = event.target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute('download')) return null;
  if (anchor.target !== '' && anchor.target !== '_self') return null;
  // A link to a place on this page does not navigate the router.
  if (anchor.getAttribute('href')?.startsWith('#')) return null;
  return anchor;
}

/**
 * Listens for the events that change the URL without a control: clicks on links and the
 * history buttons. Returns the function that stops listening.
 */
export function watchNavigation(): () => void {
  // Capture phase: the query is set before the click reaches the link. Subscribers are told
  // in the bubble phase, after the link has navigated, so the link that was clicked (a "show
  // more" link points one step further once the query has moved) is not re-rendered under the click.
  const onClickCapture = (event: MouseEvent) => {
    const anchor = followedLink(event);
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    set(normalise(url.search), {
      pushed: anchor.getAttribute('data-history') !== 'replace',
      keepDrafts: false,
    });
    unannounced = true;
  };
  const onClickBubble = () => {
    if (unannounced) emit();
  };
  // A state-less entry is one the router ignores too: a jump to a place on the page.
  const onPopState = (event: PopStateEvent) => {
    if (event.state !== null) resyncIntendedQuery();
  };

  window.addEventListener('click', onClickCapture, true);
  window.addEventListener('click', onClickBubble);
  window.addEventListener('popstate', onPopState);
  return () => {
    window.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('click', onClickBubble);
    window.removeEventListener('popstate', onPopState);
  };
}

// The query of the address the document was loaded from, read before the router changes
// anything. A part of the page can hydrate after the router has already replaced the address
// (the restored assumptions); the router's search parameters are newer than that HTML then,
// and hydration does not repair an attribute that differs.
const documentQuery: string | null = typeof window === 'undefined' ? null : browserQuery();

/**
 * The intended query. On the server and while hydrating it is the query of the request,
 * so the HTML and the first render of the browser agree.
 */
export function useIntendedQuery(): string {
  const requestQuery = useSearchParams().toString();
  return useSyncExternalStore(subscribe, readIntendedQuery, () => documentQuery ?? requestQuery);
}

const getEpoch = (): number => epoch;
const getServerEpoch = (): number => 0;

/** Changes whenever text typed into a field but not yet written has to be dropped. */
export function useIntendedEpoch(): number {
  return useSyncExternalStore(subscribe, getEpoch, getServerEpoch);
}

/**
 * Returns `write(mutate)`: applies `mutate` to a copy of the intended query as it is at
 * that moment, makes the result the intended query and sends the router there.
 * Returns the new query. Nothing happens when the query does not change.
 */
export function useQueryWriter() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (mutate: (params: URLSearchParams) => void, options?: { typing?: boolean }): string => {
      const params = new URLSearchParams(readIntendedQuery());
      mutate(params);
      const next = params.toString();
      if (next === readIntendedQuery()) return next;

      const pushed = pushPending;
      set(next, { pushed, keepDrafts: options?.typing === true });
      emit();
      const href = withQuery(pathname, params);
      if (pushed) router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
      return next;
    },
    [router, pathname],
  );
}
