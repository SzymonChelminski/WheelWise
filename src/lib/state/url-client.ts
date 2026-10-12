import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { withQuery } from './assumption-params';

/*
 * Writes to the query string of the current page without a full reload and
 * without scrolling. Several controls (filters, assumptions) can change the URL
 * before the router has applied the previous change; such a write has to build
 * on the previous one, not on the URL the browser still shows.
 *
 * So the writes the router has not applied yet are remembered, in order. A write
 * starts from the last of them while there is one, otherwise from the URL the
 * browser has at that moment. An entry stays only until the URL shows it (or a
 * later one); any other change of the URL (a link, the back and forward buttons,
 * a navigation made in code) discards all of them, so nothing a navigation
 * changed or removed can come back.
 */
let unapplied: { pathname: string; queries: string[] } = { pathname: '', queries: [] };

/** Forget the writes that are still on their way; call it before navigating in code. */
export function forgetPendingWrites(): void {
  unapplied = { pathname: '', queries: [] };
}

/** The URL now shows `query`: that write, and every earlier one, has been applied. */
function settle(query: string): void {
  const index = unapplied.queries.indexOf(query);
  unapplied.queries = index < 0 ? [] : unapplied.queries.slice(index + 1);
}

function startingQuery(pathname: string): string {
  const { queries } = unapplied;
  if (unapplied.pathname === pathname && queries.length > 0) return queries[queries.length - 1];
  return window.location.search;
}

export function useUrlWriter() {
  const router = useRouter();
  const pathname = usePathname();
  const committed = useSearchParams().toString();
  const [isPending, startTransition] = useTransition();

  useEffect(() => settle(committed), [committed]);

  // A link or the history buttons change the URL on their own; a write that was
  // waiting for the router must not be applied on top of that.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href]')) forgetPendingWrites();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', forgetPendingWrites);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', forgetPendingWrites);
    };
  }, []);

  /**
   * Applies `mutate` to the current query and replaces the URL with the result.
   * `optimistic` runs in the same transition: use it to show the new state at once.
   */
  const write = useCallback(
    (mutate: (params: URLSearchParams) => void, optimistic?: () => void) => {
      const params = new URLSearchParams(startingQuery(pathname));
      mutate(params);
      if (unapplied.pathname !== pathname) unapplied = { pathname, queries: [] };
      unapplied.queries.push(params.toString());
      startTransition(() => {
        optimistic?.();
        router.replace(withQuery(pathname, params), { scroll: false });
      });
    },
    [pathname, router],
  );

  return { write, isPending };
}
