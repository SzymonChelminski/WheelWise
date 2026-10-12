import { Link } from "@/i18n/navigation";
import { cn } from "./cn";
import { Select } from "./Fields";

/*
 * Metric selector for the rankings page. Nine metrics.
 *   from 768 px  a wrapping row of links; the current one is filled
 *   below 768 px a native select: one row instead of five, native picker
 * Each metric is a URL, so the desktop control is navigation (links), not tabs.
 */
export interface MetricOption {
  key: string;
  /** "Całkowity koszt" */
  label: string;
  href: string;
}

export function MetricSelector({
  metrics,
  current,
  labels,
  onSelectChange,
  id = "metric",
  className,
}: {
  metrics: MetricOption[];
  /** Key of the current metric. */
  current: string;
  labels: {
    /** Name of the navigation landmark and label of the select: "Ranking według". */
    label: string;
  };
  /** Mobile select: called with the metric key. */
  onSelectChange?: (key: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Select
        id={id}
        label={labels.label}
        className="md:hidden"
        {...(onSelectChange
          ? {
              value: current,
              onChange: (event) => onSelectChange(event.target.value),
            }
          : { defaultValue: current })}
      >
        {metrics.map((metric) => (
          <option key={metric.key} value={metric.key}>
            {metric.label}
          </option>
        ))}
      </Select>

      <nav aria-label={labels.label} className="hidden md:block">
        <ul role="list" className="flex flex-wrap gap-2">
          {metrics.map((metric) => {
            const isCurrent = metric.key === current;
            return (
              <li key={metric.key}>
                <Link
                  href={metric.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-(--duration-fast)",
                    isCurrent
                      ? "border-brand bg-brand font-semibold text-on-brand"
                      : "border-line-strong bg-surface text-ink hover:border-brand hover:bg-brand-soft",
                  )}
                >
                  {metric.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** List of links with a one-line description each: the nine rankings on the home page. */
export function LinkList({
  items,
  label,
  className,
}: {
  items: { href: string; title: string; description: string }[];
  /** Accessible name of the list. */
  label: string;
  className?: string;
}) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={cn(
        "grid overflow-hidden rounded-lg border border-line bg-line gap-px sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.href} className="flex bg-surface">
          <Link
            href={item.href}
            className="group flex min-h-18 flex-1 flex-col justify-center px-5 py-4 -outline-offset-3 transition-colors duration-(--duration-fast) hover:bg-brand-soft"
          >
            <span className="font-display text-lg font-semibold text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[3px]">
              {item.title}
            </span>
            <span className="mt-0.5 text-sm text-ink-muted">{item.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
