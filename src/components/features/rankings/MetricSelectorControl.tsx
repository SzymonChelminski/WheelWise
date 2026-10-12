"use client";

import { MetricSelector, type MetricOption } from "@/components/ui/MetricSelector";
import { useRouter } from "@/i18n/navigation";

/** The designer's metric selector; the narrow-screen select navigates like the links do. */
export function MetricSelectorControl({
  metrics,
  current,
  label,
  className,
}: {
  metrics: MetricOption[];
  current: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <MetricSelector
      metrics={metrics}
      current={current}
      labels={{ label }}
      className={className}
      onSelectChange={(key) => {
        const target = metrics.find((metric) => metric.key === key);
        if (target) router.push(target.href);
      }}
    />
  );
}
