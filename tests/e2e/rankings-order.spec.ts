import type { RankedCar, RankingFilters, RankingMetric } from "@/lib/costs";
import type { Page } from "@playwright/test";
import { assumptionsWith, nameOf, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { integer, msg } from "./helpers/text";
import {
  chooseMetric,
  chooseOrder,
  expectedRow,
  expectQuery,
  expectRows,
  interactive,
  listTitle,
  orderedListName,
  orderRadio,
  rankingList,
  slowNavigations,
  toggleFilter,
  visit,
  type SortDirection,
} from "./helpers/ui";

const pl = "pl" as const;

/**
 * The ranking with the highest value first, worked out here from the values of the
 * ascending ranking: higher value first, equal values by slug ascending, rank = position.
 */
function highestFirst(items: RankedCar[]): RankedCar[] {
  return [...items]
    .sort((x, y) => y.value - x.value || (x.car.slug < y.car.slug ? -1 : x.car.slug > y.car.slug ? 1 : 0))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

interface Expected {
  metric: RankingMetric;
  filters?: RankingFilters;
  assumptions?: ReturnType<typeof assumptionsWith>;
  period?: "month" | "year";
  direction: SortDirection;
  limit?: number;
}

/** Heading, car count, list name and the first rows equal the ranking in the given order. */
async function expectOrderedRanking(page: Page, expected: Expected): Promise<void> {
  const { metric, filters = {}, assumptions = assumptionsWith(), period = "month", direction, limit = 10 } = expected;
  const ascending = ranking(metric, filters, assumptions);
  const ordered = direction === "desc" ? highestFirst(ascending) : ascending;
  const electricOnly = filters.fuelTypes?.length === 1 && filters.fuelTypes[0] === "ev";
  const title = listTitle(pl, metric, period);
  const main = page.getByRole("main");
  // The heading names what is ranked; only the list's name says the order.
  await expect(main.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  await expect(main.getByText(msg(pl, "common.cars", { count: ordered.length }), { exact: true })).toBeVisible();
  await expectRows(
    rankingList(page, title, direction),
    ordered.slice(0, limit).map((item) => expectedRow(item, metric, period, pl, electricOnly)),
  );
  await expect(orderRadio(page, direction)).toBeChecked();
}

test.describe("ranking order", () => {
  test.describe("from the address", () => {
    const cases: { metric: RankingMetric; query: string; filters?: RankingFilters; period?: "month" | "year" }[] = [
      { metric: "price", query: "metric=price" },
      { metric: "totalCost", query: "" },
      { metric: "fuelConsumption", query: "metric=fuelConsumption" },
      { metric: "fuelConsumption", query: "metric=fuelConsumption&fuel=ev", filters: { fuelTypes: ["ev"] } },
      { metric: "depreciation", query: "metric=depreciation&period=year", period: "year" },
      { metric: "insurance", query: "metric=insurance" },
    ];
    for (const item of cases) {
      test(`dir=desc lists the highest value first: ${item.query || "totalCost"}`, async ({ page }) => {
        const query = item.query ? `${item.query}&dir=desc` : "dir=desc";
        await visit(page, `/pl/rankings?${query}`);
        await expectOrderedRanking(page, {
          metric: item.metric,
          filters: item.filters,
          period: item.period,
          direction: "desc",
        });
      });
    }

    test("rank 1 with dir=desc is the car with the highest value of the whole ranking", async ({ page }) => {
      const all = ranking("price");
      const highest = Math.max(...all.map((item) => item.value));
      const top = highestFirst(all)[0];
      expect(top.value).toBe(highest);
      await visit(page, "/pl/rankings?metric=price&dir=desc");
      const first = rankingList(page, listTitle(pl, "price"), "desc").getByRole("listitem").first();
      await expect(first.getByRole("heading", { level: 3 })).toHaveText(`1. ${nameOf(top.car)}`);
    });

    for (const value of ["xyz", "DESC", "", "asc", "descending"]) {
      test(`dir=${value || "(empty)"} reads as lowest first`, async ({ page }) => {
        await visit(page, `/pl/rankings?metric=price&dir=${value}`);
        await expectOrderedRanking(page, { metric: "price", direction: "asc" });
        await expect(orderRadio(page, "desc")).not.toBeChecked();
      });
    }

    test("without dir the order is lowest first and the switch shows it", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price");
      await expectOrderedRanking(page, { metric: "price", direction: "asc" });
    });
  });

  test.describe("switching the order", () => {
    const start =
      "/pl/rankings?metric=insurance&fuel=petrol&body=suv&km=20000&years=3&period=year&limit=20";
    const kept = ["body=suv", "fuel=petrol", "km=20000", "metric=insurance", "period=year", "years=3"];
    const filters: RankingFilters = { fuelTypes: ["petrol"], bodyTypes: ["suv"] };
    const assumptions = assumptionsWith({ km: 20000, years: 3 });

    test("writes dir=desc, keeps metric, filters, period and assumptions, and starts again from the first ten rows", async ({
      page,
    }) => {
      expect(ranking("insurance", filters, assumptions).length, "more cars than two pages").toBeGreaterThan(20);
      await visit(page, start);
      await expectOrderedRanking(page, { metric: "insurance", filters, assumptions, period: "year", direction: "asc", limit: 20 });

      await chooseOrder(page, "desc");
      await expectQuery(page, [...kept, "dir=desc"]);
      await expectOrderedRanking(page, { metric: "insurance", filters, assumptions, period: "year", direction: "desc" });
      const total = ranking("insurance", filters, assumptions).length;
      await expect(
        page.getByText(msg(pl, "rankings.showing", { shown: integer(10, pl), total: integer(total, pl) })),
      ).toBeVisible();
    });

    test("switching back removes dir from the address", async ({ page }) => {
      await visit(page, `${start}&dir=desc`);
      await expectOrderedRanking(page, { metric: "insurance", filters, assumptions, period: "year", direction: "desc", limit: 20 });

      await chooseOrder(page, "asc");
      await expectQuery(page, kept);
      await expectOrderedRanking(page, { metric: "insurance", filters, assumptions, period: "year", direction: "asc" });
    });

    test("the list's accessible name says the order", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price");
      const title = listTitle(pl, "price");
      const main = page.getByRole("main");
      await expect(main.getByRole("list", { name: orderedListName(pl, title, "asc"), exact: true })).toBeVisible();
      await expect(main.getByRole("list", { name: `${title}, od najniższej`, exact: true })).toBeVisible();

      await chooseOrder(page, "desc");
      await expect(main.getByRole("list", { name: `${title}, od najwyższej`, exact: true })).toBeVisible();
      await expect(main.getByRole("list", { name: `${title}, od najniższej`, exact: true })).toHaveCount(0);
    });

    test("in English the list's name says the order too", async ({ page }) => {
      await visit(page, "/en/rankings?metric=price&dir=desc");
      const title = listTitle("en", "price");
      await expect(
        page.getByRole("main").getByRole("list", { name: orderedListName("en", title, "desc"), exact: true }),
      ).toBeVisible();
      await expect(orderRadio(page, "desc")).toBeChecked();
    });

    test("a click keeps focus on the selected segment, and the switch is not rebuilt", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price");
      const desc = orderRadio(page, "desc");
      await interactive(desc);
      await desc.evaluate((element) => {
        (element as unknown as { __kept?: boolean }).__kept = true;
      });

      await desc.click();
      await expectQuery(page, ["dir=desc", "metric=price"]);
      await expect(rankingList(page, listTitle(pl, "price"), "desc")).toBeVisible();
      await expect(desc).toBeChecked();
      await expect(desc).toBeFocused();
      expect(
        await desc.evaluate((element) => (element as unknown as { __kept?: boolean }).__kept === true),
        "the same radio element after the list was updated",
      ).toBe(true);
    });

    test("arrow keys change the order and focus stays on the switch", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price");
      const asc = orderRadio(page, "asc");
      const desc = orderRadio(page, "desc");
      await interactive(asc);
      await asc.focus();

      await page.keyboard.press("ArrowRight");
      await expectQuery(page, ["dir=desc", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", direction: "desc" });
      await expect(desc).toBeFocused();

      await page.keyboard.press("ArrowLeft");
      await expectQuery(page, ["metric=price"]);
      await expectOrderedRanking(page, { metric: "price", direction: "asc" });
      await expect(asc).toBeFocused();
    });

    test("the order switch is one Tab stop, on the selected segment", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price&dir=desc");
      const desc = orderRadio(page, "desc");
      await interactive(desc);
      // Start at "Zmień" of the assumptions summary, the last control above the title row.
      const change = page.getByRole("main").getByRole("button", { name: msg(pl, "assumptions.change"), exact: true });
      await interactive(change);
      await change.focus();
      let stops = 0;
      while (stops < 5 && !(await desc.evaluate((element) => element === document.activeElement))) {
        await page.keyboard.press("Tab");
        stops += 1;
      }
      await expect(desc, "Tab reaches the selected segment").toBeFocused();
      await page.keyboard.press("Tab");
      await expect(desc).not.toBeFocused();
      await expect(orderRadio(page, "asc"), "the other segment is not a Tab stop").not.toBeFocused();
    });
  });

  test.describe("other controls keep the order", () => {
    test("another metric keeps dir=desc and the filters", async ({ page }) => {
      await visit(page, "/pl/rankings?dir=desc&fuel=hybrid");
      await expectOrderedRanking(page, { metric: "totalCost", filters: { fuelTypes: ["hybrid"] }, direction: "desc" });
      await chooseMetric(page, "price");
      await expectQuery(page, ["dir=desc", "fuel=hybrid", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", filters: { fuelTypes: ["hybrid"] }, direction: "desc" });
    });

    test("a filter keeps dir=desc", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price&dir=desc");
      await toggleFilter(page, msg(pl, "attr.fuel.hybrid"));
      await expectQuery(page, ["dir=desc", "fuel=hybrid", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", filters: { fuelTypes: ["hybrid"] }, direction: "desc" });
    });

    test("show more keeps dir=desc and adds ten rows in the same order", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price&dir=desc");
      const more = page.getByRole("link", { name: msg(pl, "rankings.showMore"), exact: true });
      await interactive(more);
      await more.click();
      await expectQuery(page, ["dir=desc", "limit=20", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", direction: "desc", limit: 20 });
    });

    test("a reload keeps the order", async ({ page }) => {
      await visit(page, "/pl/rankings?metric=price");
      await chooseOrder(page, "desc");
      await expectQuery(page, ["dir=desc", "metric=price"]);
      await page.reload();
      await expectOrderedRanking(page, { metric: "price", direction: "desc" });
    });
  });

  test("the home page lists stay lowest first and have no order switch", async ({ page }) => {
    await visit(page, "/pl?dir=desc");
    await expectRows(
      rankingList(page, msg(pl, "home.topPriceTitle")),
      ranking("price")
        .slice(0, 5)
        .map((item) => expectedRow(item, "price", "month", pl)),
    );
    await expect(
      page.getByRole("main").getByRole("group", { name: msg(pl, "rankings.order.legend"), exact: true }),
    ).toHaveCount(0);
  });

  test.describe("clicks faster than the server", () => {
    test("an order change right before a filter change keeps both", async ({ page }) => {
      const held = await slowNavigations(page, 1500);
      await visit(page, "/pl/rankings?metric=price");
      await chooseOrder(page, "desc");
      await toggleFilter(page, msg(pl, "attr.fuel.hybrid"));
      await expectQuery(page, ["dir=desc", "fuel=hybrid", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", filters: { fuelTypes: ["hybrid"] }, direction: "desc" });
      expect(held(), "navigation responses held back").toBeGreaterThan(0);
    });

    test("a filter change right before an order change keeps both", async ({ page }) => {
      const held = await slowNavigations(page, 1500);
      await visit(page, "/pl/rankings?metric=price&dir=desc");
      await toggleFilter(page, msg(pl, "attr.fuel.ev"));
      await chooseOrder(page, "asc");
      await expectQuery(page, ["fuel=ev", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", filters: { fuelTypes: ["ev"] }, direction: "asc" });
      expect(held(), "navigation responses held back").toBeGreaterThan(0);
    });

    test("two order changes and a filter in a row end with the last order", async ({ page }) => {
      const held = await slowNavigations(page, 1500);
      await visit(page, "/pl/rankings?metric=price");
      await chooseOrder(page, "desc");
      await chooseOrder(page, "asc");
      await chooseOrder(page, "desc");
      await toggleFilter(page, msg(pl, "attr.body.suv"));
      await expectQuery(page, ["body=suv", "dir=desc", "metric=price"]);
      await expectOrderedRanking(page, { metric: "price", filters: { bodyTypes: ["suv"] }, direction: "desc" });
      expect(held(), "navigation responses held back").toBeGreaterThan(0);
    });
  });
});
