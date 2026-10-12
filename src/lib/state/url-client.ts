import { useCallback, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { withQuery } from './assumption-params';

/*
 * Writes to the query string of the current page without a full reload and
 * without scrolling. Several controls (filters, assumptions) can change the URL
 * within a short time; a change made while the previous one is still loading
 * must build on that previous one, not on the URL the browser shows until the
 * page has arrived. Hence the remembered "pending" query.
 */
const PENDING_MS = 2000;
let pending: { pathname: string; search: string; at: number } | null = null;

function currentSearch(pathname: string): string {
  if (pending && pending.pathname === pathname && Date.now() - pending.at < PENDING_MS) {
    return pending.search;
  }
  return window.location.search;
}

export function useUrlWriter() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  /**
   * Applies `mutate` to the current query and replaces the URL with the result.
   * `optimistic` runs in the same transition: use it to show the new state at once.
   */
  const write = useCallback(
    (mutate: (params: URLSearchParams) => void, optimistic?: () => void) => {
      const params = new URLSearchParams(currentSearch(pathname));
      mutate(params);
      pending = { pathname, search: params.toString(), at: Date.now() };
      startTransition(() => {
        optimistic?.();
        router.replace(withQuery(pathname, params), { scroll: false });
      });
    },
    [pathname, router],
  );

  return { write, isPending };
}
