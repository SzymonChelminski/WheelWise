"use client";

import { useRestoreAssumptions } from "@/lib/state/assumptions-client";

/** Put on a page that shows costs: a visit without assumption parameters takes the stored ones. */
export function AssumptionsRestore() {
  useRestoreAssumptions();
  return null;
}
