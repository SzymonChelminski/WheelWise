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

/**
 * Text being typed into a field that the URL does not know yet. It is shown until `epoch`
 * (src/lib/state/intended-query.ts) moves on, and `source` (the intended value) after that.
 */
export function useEpochDraft(source: string, epoch: number) {
  const [draft, setDraft] = useState<{ epoch: number; text: string } | null>(null);
  const text = draft !== null && draft.epoch === epoch ? draft.text : source;
  const setText = useCallback((next: string) => setDraft({ epoch, text: next }), [epoch]);
  return [text, setText] as const;
}

/**
 * Runs the latest action once the user has stopped typing for `delay` milliseconds.
 * A pending action is dropped when `resetKey` changes.
 */
export function useDebouncedRun(delay = 400, resetKey?: unknown) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = useCallback(() => clearTimeout(timer.current), []);
  const run = useCallback(
    (action: () => void) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(action, delay);
    },
    [delay],
  );
  useEffect(() => cancel, [cancel, resetKey]);

  return { run, cancel };
}
