import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/* Loading skeletons, the empty state and the inline error. */

/** One grey block. Compose skeletons from these; keep the real layout's sizes. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-skeleton rounded-sm bg-sunken", className)}
    />
  );
}

function Busy({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Skeleton of a ranking list. Same row height as RankingItem. */
export function RankingListSkeleton({
  rows = 5,
  label,
}: {
  rows?: number;
  /** "Wczytuję ranking…" */
  label: string;
}) {
  return (
    <Busy label={label} className="@container">
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 px-4 py-4 @3xl:grid-cols-[2.25rem_minmax(0,1fr)_8.5rem_9.5rem] @3xl:gap-x-6 @3xl:px-5"
          >
            <Skeleton className="h-6 w-5" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-4/5 max-w-64" />
              <Skeleton className="h-4 w-3/5 max-w-48" />
            </div>
            <div className="@3xl:col-start-3 @3xl:row-span-2 @3xl:row-start-1 @3xl:self-center">
              <Skeleton className="ml-auto h-6 w-20" />
              <Skeleton className="mt-2 ml-auto h-3 w-14" />
            </div>
            <Skeleton className="col-span-2 col-start-2 h-2 @3xl:col-span-1 @3xl:col-start-2 @3xl:row-start-2" />
            <Skeleton className="col-span-2 col-start-2 h-9 w-28 @3xl:col-span-1 @3xl:col-start-4 @3xl:row-span-2 @3xl:row-start-1 @3xl:ml-auto @3xl:self-center" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Skeleton of the car page: identity, price, cost breakdown. */
export function CarPageSkeleton({
  label,
}: {
  /** "Wczytuję dane auta…" */
  label: string;
}) {
  return (
    <Busy label={label} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <Skeleton className="h-10 w-4/5 max-w-lg" />
        <Skeleton className="mt-3 h-5 w-3/5 max-w-sm" />
        <Skeleton className="mt-6 h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-8 rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-5 h-6 w-full" />
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="mt-4 flex justify-between gap-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-surface p-5">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="mt-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Skeleton of the comparison table. */
export function ComparisonSkeleton({
  columns = 3,
  label,
}: {
  columns?: 2 | 3;
  /** "Wczytuję porównanie…" */
  label: string;
}) {
  return (
    <Busy label={label} className="rounded-lg border border-line bg-surface">
      <div
        className="grid gap-x-4 gap-y-5 p-4 md:p-5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <div key={`head-${index}`}>
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="mt-2 h-2 w-full" />
          </div>
        ))}
        {Array.from({ length: columns * 7 }, (_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-5 w-20" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Nothing to show, and what to do about it. No illustration: the text does the work. */
export function EmptyState({
  title,
  children,
  actions,
  headingLevel = "h2",
  className,
}: {
  title: string;
  /** One or two sentences: why it is empty and how to fill it. */
  children: ReactNode;
  /** Buttons or links. The first one is the suggested way out. */
  actions?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8 md:px-8 md:py-10",
        className,
      )}
    >
      <Heading className="font-display text-2xl font-semibold text-ink">{title}</Heading>
      <div className="mt-2 max-w-prose text-base text-ink-muted">{children}</div>
      {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** A part of the page failed to load. Says what happened and offers a retry. */
export function InlineError({
  title,
  children,
  action,
  className,
}: {
  /** "Nie udało się wczytać rankingu" */
  title: string;
  /** What the user can do; no apology, no error codes. */
  children: ReactNode;
  /** Retry button. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-danger bg-danger-soft px-4 py-4 md:px-5",
        className,
      )}
    >
      <Icon name="alert" size={24} className="mt-0.5 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        <div className="mt-1 text-sm text-ink">{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
