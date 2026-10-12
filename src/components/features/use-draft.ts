import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text being typed into a field. It follows `source` (the value in the URL)
 * whenever that changes, and the user can edit it in between.
 */
export function useSyncedDraft(source: string) {
  const [draft, setDraft] = useState(source);
  const [seen, setSeen] = useState(source);
  if (source !== seen) {
    setSeen(source);
    setDraft(source);
  }
  return [draft, setDraft] as const;
}

/** Runs the latest action once the user has stopped typing for `delay` milliseconds. */
export function useDebouncedRun(delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = useCallback(() => clearTimeout(timer.current), []);
  const run = useCallback(
    (action: () => void) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(action, delay);
    },
    [delay],
  );
  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
