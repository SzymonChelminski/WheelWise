import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * Power labels and the attribute line printed next to a car name
 * (body type, fuel, gearbox and power always accompany a name, because
 * two cars can share one).
 *
 * The source data does not give the same kind of power for every powertrain:
 *   petrol, diesel, LPG    engine power                      "91 KM"
 *   hybrid, plug-in hybrid combustion engine only            "silnik spalinowy 116 KM"
 *   electric               the figure in the source data,    "120 KM wg źródła"
 *                          usually rated (continuous) power
 *
 * Short form: <PowerLabel>, used inside <CarMeta> in compact lists. Sighted
 * users read the short text; assistive technology reads the full text.
 * Full form: <PowerDetail>, used as the value of the power attribute on the
 * car page; the comparison table prints the same texts in its power row.
 * All texts arrive translated: src/mocks/copy.ts, key "power".
 */
export interface PowerText {
  /** Short visible text: "91 KM", "silnik spalinowy 116 KM", "120 KM wg źródła". */
  short: string;
  /** Full text: "moc silnika spalinowego: 85 kW (116 KM)". Read instead of the short text. */
  full: string;
}

/** Short form of a power value. Its accessible text is the full form. */
export function PowerLabel({ short, full, className }: PowerText & { className?: string }) {
  return (
    <span data-power-label="short" className={cn("whitespace-nowrap", className)}>
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

/**
 * One phrase of attributes: "SUV, hybryda, skrzynia manualna, silnik spalinowy 131 KM".
 * It wraps between attributes and is never truncated.
 */
export function CarMeta({
  attributes,
  power,
}: {
  /** Body type, powertrain, gearbox, in this order, already translated. */
  attributes: string[];
  power: PowerText;
}) {
  return (
    <>
      {attributes.join(", ")}, <PowerLabel {...power} />
    </>
  );
}

/**
 * Full form of a power value: the figure and, under it, what kind of power it
 * is. The term next to it (<dt>, row header) is the full label.
 */
export function PowerDetail({
  value,
  note,
  className,
}: {
  /** "88 kW (120 KM)" */
  value: string;
  /** Explanation with an optional link to the methodology page. Omit for plain engine power. */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <span data-power-label="full" className={cn("block", className)}>
      <span className="block tabular-nums">{value}</span>
      {note && <span className="mt-0.5 block text-xs font-normal text-ink-muted">{note}</span>}
    </span>
  );
}
