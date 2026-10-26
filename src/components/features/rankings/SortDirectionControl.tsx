"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { SortDirectionSwitch } from "@/components/ui/SortDirection";
import { useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { parseRankingParams } from "./params";

/**
 * The order switch. It shows the direction of the intended query; only "desc" is written, so
 * the default keeps the URL clean. A new order starts the list from the top again.
 */
export function SortDirectionControl({ className }: { className?: string }) {
  const t = useTranslations("rankings.order");
  // The radio group of a page kept hidden after a navigation must not join this one.
  const name = useId();
  const write = useQueryWriter();
  const { direction } = parseRankingParams(new URLSearchParams(useIntendedQuery()));

  return (
    <SortDirectionSwitch
      name={name}
      className={className}
      labels={{ legend: t("legend"), asc: t("asc"), desc: t("desc") }}
      value={direction}
      onChange={(next) =>
        write((params) => {
          if (next === "desc") params.set("dir", "desc");
          else params.delete("dir");
          params.delete("limit");
        })
      }
    />
  );
}
