"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "./Button";
import { CarName, nameWrapClass } from "./CarName";
import { cn } from "./cn";
import { Icon } from "./Icon";

/*
 * Comparison bar: pinned to the bottom of the viewport while 1 to 3 cars are
 * selected. With 0 cars it is not rendered on real pages (showWhenEmpty is for
 * the preview).
 *
 * One pattern at every width: the count is a disclosure button. Opening it
 * lists the selected cars above the bar with their whole names, attributes, a
 * remove button each, and "clear". From 1024 px the closed bar also shows the
 * cars in one row, names cut to one line; the open list is where a cut name
 * can be read in full.
 *
 * The component keeps UI state only (open or closed). The open list closes on
 * Escape and when focus leaves the bar.
 *
 * Reserved space: while the fixed bar is shown it writes the height it has when
 * closed as --bar-height on <html>, whether it is closed or open. globals.css
 * turns that into scroll-padding-bottom, so a focused control is never left
 * under the bar (WCAG 2.2 SC 2.4.11), and the footer keeps the same room free.
 * Because the room never follows the open list, opening or closing the bar
 * does not move the page. The closed height depends on the number of cars, the
 * language and the width, so while the list is open the bar also lays out a
 * closed copy of itself that nobody can see, reach or hear, and measures that.
 * Nothing else may write or remove --bar-height.
 *
 * Focus after a removal: the remove button that had focus leaves the page with
 * its car, so the bar moves focus itself. It goes to the remove button of the
 * car that takes the same place in the list (the last car when the removed one
 * was last). When no car is left, after the last removal or after "clear", it
 * goes to the page's <main>, the target of the skip link.
 */

/**
 * Id of the hint line of the page's comparison bar. Full compare toggles point
 * to it with aria-describedby. A fixed bar uses it by default.
 */
export const COMPARE_BAR_HINT_ID = "compare-bar-hint";

/** Id of the page's <main> (SiteShell): where focus goes when the bar empties. */
const MAIN_ID = "main";

export interface CompareBarCar {
  slug: string;
  /** make + " " + variant */
  name: string;
  /** Attributes, normally <CarMeta>: body type, fuel, gearbox, power. Two cars can share a name. */
  meta: ReactNode;
}

export interface CompareBarLabels {
  /** Landmark name: "Porównanie". */
  region: string;
  /** Visible text of the disclosure button: "Wybrane: 2 z 3". */
  toggle: string;
  /** Announced when the selection changes: "Wybrano 2 z 3 aut". */
  count: string;
  /** Accessible name of the list: "Wybrane auta". */
  list: string;
  /** "Porównaj 2 auta" (already pluralised). Used when 2 or 3 cars are selected. */
  compare: string;
  /** Label of the disabled action with 0 or 1 car: "Porównaj". */
  compareIdle: string;
  /** Hint with 1 car: "Dodaj jeszcze jedno auto, aby porównać." */
  needMore: string;
  /** Hint with 0 cars: "Dodaj 2 lub 3 auta przyciskiem „Porównaj”." */
  empty: string;
  /** Hint with 3 cars: "Komplet. Usuń auto, aby dodać inne." */
  full: string;
  /** "Usuń z porównania" (the car name is appended). */
  remove: string;
  /** "Wyczyść" */
  clear: string;
}

export function CompareBar({
  cars,
  compareHref,
  labels,
  notice,
  onRemove,
  onClear,
  position = "fixed",
  hintId,
  showWhenEmpty = false,
  defaultExpanded = false,
}: {
  /** 0 to 3 selected cars. */
  cars: CompareBarCar[];
  /** Link to /compare?cars=... */
  compareHref: string;
  labels: CompareBarLabels;
  /**
   * Message shown in place of the hint after the user tried to add a fourth car:
   * "Porównanie mieści 3 auta. Usuń jedno, aby dodać kolejne." Keep it until the
   * selection changes; it is announced as a status message.
   */
  notice?: string;
  onRemove?: (slug: string) => void;
  onClear?: () => void;
  /** "static" places the bar in the flow (preview). */
  position?: "fixed" | "static";
  /**
   * Id of the hint line. Default: COMPARE_BAR_HINT_ID for the fixed bar (one per
   * page), a generated id for a static bar, so several bars never share an id.
   */
  hintId?: string;
  showWhenEmpty?: boolean;
  /** Preview only: render with the list open. */
  defaultExpanded?: boolean;
}) {
  const panelId = useId();
  const ownHintId = useId();
  const barRef = useRef<HTMLElement>(null);
  const closedCopyRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Place in the list of the car being removed, -1 while the selection is being cleared, null otherwise.
  const removedAt = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const count = cars.length;
  const fixed = position === "fixed";
  const open = expanded && count > 0;
  const hintLineId = hintId ?? (fixed ? COMPARE_BAR_HINT_ID : ownHintId);

  // Runs when the selection got shorter after "remove" or "clear": puts focus where the comment above says.
  useEffect(() => {
    const index = removedAt.current;
    if (index === null) return;
    removedAt.current = null;
    // The user has already moved on to another control: leave focus there.
    const active = document.activeElement;
    if (active && active !== document.body && !barRef.current?.contains(active)) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (index >= 0 && buttons && buttons.length > 0) {
      buttons[Math.min(index, buttons.length - 1)].focus();
    } else {
      document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
    }
  }, [count]);

  // Publishes the closed height before the browser paints: the closed bar is measured directly,
  // the open bar through its closed copy. The observer follows a resize, a font that loads late
  // and a hint that changes. With nothing rendered the property is removed.
  useLayoutEffect(() => {
    if (!fixed) return;
    const root = document.documentElement;
    const closed = open ? closedCopyRef.current : barRef.current;
    if (!closed) {
      root.style.removeProperty("--bar-height");
      return;
    }
    const publish = () => root.style.setProperty("--bar-height", `${closed.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(closed);
    return () => observer.disconnect();
  }, [fixed, open, count]);

  useLayoutEffect(() => {
    if (!fixed) return;
    return () => {
      document.documentElement.style.removeProperty("--bar-height");
    };
  }, [fixed]);

  if (count === 0 && !showWhenEmpty) return null;
  const ready = count >= 2;
  const hint =
    notice ?? (count === 0 ? labels.empty : count === 1 ? labels.needMore : count >= 3 ? labels.full : "");

  /*
   * The content of the bar. `copy` renders the closed layout for measuring only: same elements
   * and classes, but no ids, refs, handlers, names, live regions or link target.
   */
  const content = (open: boolean, copy: boolean) => (
    <div
      className={cn(
        "mx-auto grid max-w-page grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 md:px-6 lg:px-8",
        !open && "lg:grid-cols-[13rem_minmax(0,1fr)_auto_auto] lg:gap-x-4",
      )}
    >
      {count > 0 ? (
        <button
          ref={copy ? undefined : toggleRef}
          type="button"
          aria-expanded={copy ? undefined : open}
          aria-controls={copy ? undefined : panelId}
          onClick={copy ? undefined : () => setExpanded(!open)}
          className={cn(
            "col-start-1 row-start-3 -ml-2 inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-md px-2 font-display text-lg leading-6 font-semibold whitespace-nowrap text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-strong",
            !open && "lg:row-start-1",
          )}
        >
          {labels.toggle}
          <Icon
            name="chevron-down"
            className={cn(
              "text-on-brand-muted transition-transform duration-(--duration-fast)",
              !open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <p className="col-start-1 row-start-3 flex min-h-11 items-center font-display text-lg leading-6 font-semibold">
          {labels.toggle}
        </p>
      )}
      {!copy && (
        <p aria-live="polite" className="sr-only">
          {labels.count}
        </p>
      )}

      {count > 0 && (
        <>
          <ul
            ref={copy ? undefined : listRef}
            id={copy ? undefined : panelId}
            role="list"
            aria-label={copy ? undefined : labels.list}
            className={cn(
              "gap-2",
              open
                ? "relative col-span-full row-start-1 grid max-h-[60dvh] overflow-y-auto overscroll-contain pt-1 pb-1 md:grid-flow-col md:auto-cols-fr"
                : "hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid lg:auto-cols-fr lg:grid-flow-col",
            )}
          >
            {cars.map((car, index) => (
              <li
                key={car.slug}
                className="flex min-w-0 items-start gap-1 rounded-md bg-brand-strong py-1.5 pr-1 pl-3"
              >
                <div className="min-w-0 flex-1 py-0.5">
                  <p
                    className={cn(
                      "text-sm font-semibold text-on-brand",
                      open ? nameWrapClass : "truncate",
                    )}
                  >
                    {/* A <wbr> would break the single cut line, so the closed row prints plain text. */}
                    {open ? <CarName>{car.name}</CarName> : car.name}
                  </p>
                  <p className="text-xs text-on-brand-muted">{car.meta}</p>
                </div>
                <button
                  type="button"
                  aria-label={copy ? undefined : `${labels.remove}: ${car.name}`}
                  onClick={
                    onRemove && !copy
                      ? () => {
                          removedAt.current = index;
                          onRemove(car.slug);
                        }
                      : undefined
                  }
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-on-brand-muted transition-colors duration-(--duration-fast) hover:bg-brand hover:text-on-brand pointer-coarse:size-11"
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={
              onClear && !copy
                ? () => {
                    removedAt.current = -1;
                    onClear();
                  }
                : undefined
            }
            className={cn(
              "min-h-11 items-center rounded-md px-2 text-sm font-semibold text-on-brand underline decoration-1 underline-offset-[3px] hover:decoration-2",
              open
                ? "col-span-full row-start-2 -ml-2 inline-flex justify-self-start"
                : "hidden lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:inline-flex",
            )}
          >
            {labels.clear}
          </button>
        </>
      )}

      <p
        id={copy ? undefined : hintLineId}
        role={copy ? undefined : "status"}
        className={cn(
          "col-span-full row-start-4 text-xs empty:hidden",
          notice
            ? "flex items-start gap-1.5 pb-1.5 font-semibold text-on-brand"
            : "pb-1.5 text-on-brand-muted",
          !open && "lg:col-span-1 lg:col-start-1 lg:row-start-2",
        )}
      >
        {notice && <Icon name="alert" size={16} className="shrink-0 text-signal" />}
        {hint}
      </p>

      {ready && copy ? (
        <a
          className={cn(
            buttonClass({ variant: "signal", className: "whitespace-nowrap max-sm:px-4" }),
            "col-start-2 row-start-3",
            !open && "lg:col-start-4 lg:row-span-2 lg:row-start-1",
          )}
        >
          <Icon name="compare" className="max-sm:hidden" />
          {labels.compare}
        </a>
      ) : ready ? (
        <Link
          href={compareHref}
          className={cn(
            buttonClass({ variant: "signal", className: "whitespace-nowrap max-sm:px-4" }),
            "col-start-2 row-start-3",
            !open && "lg:col-start-4 lg:row-span-2 lg:row-start-1",
          )}
        >
          <Icon name="compare" className="max-sm:hidden" />
          {labels.compare}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(
            buttonClass({
              variant: "signal",
              disabled: true,
              className: "whitespace-nowrap max-sm:px-4",
            }),
            "col-start-2 row-start-3",
            !open && "lg:col-start-4 lg:row-span-2 lg:row-start-1",
          )}
        >
          <Icon name="compare" className="max-sm:hidden" />
          {labels.compareIdle}
        </button>
      )}
    </div>
  );

  return (
    <aside
      ref={barRef}
      aria-label={labels.region}
      data-surface="dark"
      data-compare-bar={position}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setExpanded(false);
          toggleRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        // A remove button that leaves the page with its car also loses focus: keep the list open then.
        if (removedAt.current !== null && event.relatedTarget === null) return;
        // Focus went to another control on purpose: a pending removal no longer decides where focus goes.
        removedAt.current = null;
        if (fixed && !event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
      className={cn(
        "bg-brand-deep text-on-brand shadow-raised",
        fixed ? "fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]" : "rounded-lg",
      )}
    >
      {content(open, false)}
      {fixed && open && (
        <div
          ref={closedCopyRef}
          aria-hidden="true"
          inert
          className="pointer-events-none invisible fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)]"
        >
          {content(false, true)}
        </div>
      )}
    </aside>
  );
}
