"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { CarName, nameWrapClass } from "./CarName";
import { cn } from "./cn";
import { Icon } from "./Icon";

/*
 * Car search. WAI-ARIA combobox with a listbox popup (list autocomplete):
 * focus stays in the input, arrow keys move the active option, Enter opens it,
 * Escape closes the list and, pressed again, clears the field.
 * The component holds UI state only (open, active option, typed text when
 * uncontrolled); the caller supplies the options for the current query.
 */
export interface SearchOption {
  id: string;
  href: string;
  /** make + " " + variant. Printed in full; wraps, never truncated. */
  title: string;
  /** Attributes, normally <CarMeta>: body type, fuel, gearbox, power. Two cars can share a title. */
  meta: ReactNode;
  /** Right-hand text, usually the indicative price: "65 400 zł". */
  trailing?: string;
}

export interface SearchComboboxLabels {
  /** Accessible name of the input: "Szukaj auta". */
  label: string;
  /** "Marka lub model, np. Clio…" */
  placeholder: string;
  /** "Wyczyść" */
  clear: string;
  /** Heading of the empty panel: "Nie mamy takiego auta". */
  noResultsTitle: string;
  /** "Sprawdź pisownię albo wpisz samą markę. W katalogu są tylko auta nowe." */
  noResultsHint: string;
  /** "Szukam…" */
  loading: string;
}

export function SearchCombobox({
  labels,
  options,
  query,
  defaultQuery = "",
  onQueryChange,
  onSelect,
  statusText,
  loading = false,
  size = "md",
  defaultOpen = false,
  demoActiveIndex,
  demo,
  className,
}: {
  labels: SearchComboboxLabels;
  /** Results for the current query, best first. At most 8 are shown. */
  options: SearchOption[];
  /** Controlled text. Leave undefined to let the component keep it. */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Called on Enter or click. Default: navigate to option.href. */
  onSelect?: (option: SearchOption) => void;
  /** Announced politely when results change: "5 aut" / "Brak wyników". */
  statusText?: string;
  loading?: boolean;
  /** lg = 56 px high (home page), md = 44 px. */
  size?: "md" | "lg";
  /** Preview only: render with the list open. */
  defaultOpen?: boolean;
  /** Preview only: index of the option shown as keyboard-active. */
  demoActiveIndex?: number;
  /** Preview only: show the focus ring on the field. */
  demo?: "focus";
  className?: string;
}) {
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const [inner, setInner] = useState(defaultQuery);
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(demoActiveIndex ?? -1);

  const text = query ?? inner;
  const shown = options.slice(0, 8);
  const activeIndex = active < shown.length ? active : -1;
  const hasText = text.trim().length > 0;
  const expanded = open && hasText;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function update(next: string) {
    if (query === undefined) setInner(next);
    onQueryChange?.(next);
    setActive(-1);
    setOpen(true);
  }

  function choose(option: SearchOption) {
    setOpen(false);
    if (onSelect) onSelect(option);
    else router.push(option.href);
  }

  function move(next: number) {
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const last = shown.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!expanded) setOpen(true);
        else if (last >= 0) move(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (expanded && last >= 0) move(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      case "Home":
        if (expanded && last >= 0) {
          event.preventDefault();
          move(0);
        }
        break;
      case "End":
        if (expanded && last >= 0) {
          event.preventDefault();
          move(last);
        }
        break;
      case "Enter":
        if (expanded && activeIndex >= 0) {
          event.preventDefault();
          choose(shown[activeIndex]);
        }
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (hasText) {
          event.preventDefault();
          update("");
          setOpen(false);
        }
        break;
      default:
    }
  }

  const large = size === "lg";

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div
        data-demo={demo}
        className={cn(
          "field-box flex items-center rounded-md border border-line-strong bg-surface transition-colors duration-(--duration-fast) hover:border-brand",
          large ? "h-14" : "h-11",
        )}
      >
        <Icon
          name="search"
          size={large ? 24 : 20}
          className={cn("text-ink-muted", large ? "ml-4" : "ml-3")}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={labels.label}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          name="q"
          placeholder={labels.placeholder}
          value={text}
          onChange={(event) => update(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-ink placeholder:text-ink-muted",
            large ? "text-base sm:text-lg" : "text-base",
          )}
        />
        {hasText && (
          <button
            type="button"
            aria-label={labels.clear}
            onClick={() => {
              update("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className={cn(
              "mr-1.5 inline-flex shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors duration-(--duration-fast) hover:bg-brand-soft hover:text-ink",
              large ? "size-11" : "size-8 pointer-coarse:size-10",
            )}
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {expanded ? (loading ? labels.loading : statusText) : ""}
      </p>

      <div
        className={cn(
          "absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-md border border-line bg-surface shadow-popover",
          !expanded && "hidden",
        )}
      >
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={labels.label}
          className={cn(
            "max-h-88 overflow-y-auto overscroll-contain py-1",
            (loading || shown.length === 0) && "hidden",
          )}
        >
          {shown.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseMove={() => {
                if (index !== activeIndex) setActive(index);
              }}
              className={cn(
                "flex min-h-13 cursor-pointer items-start gap-3 px-4 py-2",
                index === activeIndex
                  ? "bg-brand-tint shadow-[inset_0_0_0_2px_var(--color-brand)]"
                  : "bg-surface",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block text-base font-medium text-ink", nameWrapClass)}>
                  <CarName>{option.title}</CarName>
                </span>
                <span className="block text-xs text-ink-muted">{option.meta}</span>
              </span>
              {option.trailing && (
                <span className="shrink-0 font-display text-base leading-6 font-semibold text-ink tabular-nums">
                  {option.trailing}
                </span>
              )}
            </li>
          ))}
        </ul>
        {expanded && loading && (
          <p className="px-4 py-4 text-sm text-ink-muted">{labels.loading}</p>
        )}
        {expanded && !loading && shown.length === 0 && (
          <div className="px-4 py-4">
            <p className="text-base font-semibold text-ink">{labels.noResultsTitle}</p>
            <p className="mt-1 text-sm text-ink-muted">{labels.noResultsHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
