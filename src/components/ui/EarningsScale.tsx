import { cn } from "./cn";

/*
 * Earnings scale: four levels of net monthly income, from the income at which
 * the car is comfortable down to the income at which it is not recommended.
 * Each level is told apart by its name, its meter (1 to 4 bars: how heavily
 * the car weighs on the budget) and only then by its colour.
 */
export type AffordabilityLevel =
  | "comfortable"
  | "reasonable"
  | "stretch"
  | "not_recommended";

const TONE: Record<
  AffordabilityLevel,
  { box: string; text: string; bar: string; weight: number }
> = {
  comfortable: {
    box: "bg-positive-soft",
    text: "text-positive",
    bar: "bg-positive",
    weight: 1,
  },
  reasonable: { box: "bg-brand-soft", text: "text-brand", bar: "bg-brand", weight: 2 },
  stretch: { box: "bg-caution-soft", text: "text-caution", bar: "bg-caution", weight: 3 },
  not_recommended: {
    box: "bg-danger-soft",
    text: "text-danger",
    bar: "bg-danger",
    weight: 4,
  },
};

export interface EarningsLevel {
  level: AffordabilityLevel;
  /** "komfortowo", "rozsądnie", "na granicy", "niezalecane" */
  label: string;
  /** "od 13 100 zł", "od 8 700 do 13 100 zł", "do 6 500 zł" */
  range: string;
  /** "zakup i paliwo zajmują do 15% dochodu" */
  note: string;
}

function Meter({ level }: { level: AffordabilityLevel }) {
  const tone = TONE[level];
  return (
    <span aria-hidden="true" className="flex items-end gap-[3px]">
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "w-1.5 rounded-[1px]",
            step <= tone.weight ? tone.bar : "bg-surface shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
          )}
          style={{ height: `${4 + step * 3}px` }}
        />
      ))}
    </span>
  );
}

export function EarningsScale({
  levels,
  className,
}: {
  /** Always four items, in the order comfortable, reasonable, stretch, not_recommended. */
  levels: EarningsLevel[];
  className?: string;
}) {
  return (
    <div className={cn("@container", className)}>
      <ol
        role="list"
        className="grid gap-0.5 overflow-hidden rounded-lg @lg:grid-cols-2 @4xl:grid-cols-4"
      >
      {levels.map((item) => {
        const tone = TONE[item.level];
        return (
          <li
            key={item.level}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 px-4 py-4 @lg:grid-cols-1 @lg:px-5 @lg:py-5",
              tone.box,
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2.5 font-display text-lg font-semibold whitespace-nowrap",
                tone.text,
              )}
            >
              <Meter level={item.level} />
              {item.label}
            </p>
            <p className="text-right font-display text-lg font-semibold text-ink tabular-nums @lg:mt-1 @lg:text-left @lg:text-xl">
              {item.range}
            </p>
            <p className="col-span-2 text-xs text-ink-muted @lg:col-span-1">{item.note}</p>
          </li>
        );
      })}
      </ol>
    </div>
  );
}
