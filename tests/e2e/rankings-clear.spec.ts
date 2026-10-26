import type { RankingFilters } from "@/lib/costs";
import type { Locator, Page } from "@playwright/test";
import { assumptionsWith, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { escapeRegExp, msg, type Locale } from "./helpers/text";
import {
  chooseOrder,
  expectedRow,
  expectQuery,
  expectRows,
  filterOption,
  interactive,
  listTitle,
  openFilters,
  panelClearButton,
  panelClearStatus,
  queryOf,
  rankingList,
  slowNavigations,
  type SortDirection,
  visit,
} from "./helpers/ui";

const pl = "pl" as const;

/** Parameters that are not filters: metric, order, period and assumptions. */
const KEPT = ["metric=insurance", "dir=desc", "period=year", "km=20000", "years=3", "age=25-34", "cov=oc"];
/** Every filter parameter, a list given both as repeated and as comma-separated values, and the page size. */
const FILTERS = [
  "make=Kia",
  "make=Dacia",
  "segment=B,C",
  "body=suv",
  "fuel=petrol",
  "gear=manual",
  "pmin=50000",
  "pmax=200000",
  "q=a",
  "limit=20",
];
const KEPT_ASSUMPTIONS = assumptionsWith({ km: 20000, years: 3, age: "25-34", coverage: "oc" });

/** The ranking with the highest value first, worked out from the ascending ranking. */
function highestFirst(metric: Parameters<typeof ranking>[0], filters: RankingFilters, assumptions = assumptionsWith()) {
  return [...ranking(metric, filters, assumptions)]
    .sort((x, y) => y.value - x.value || (x.car.slug < y.car.slug ? -1 : x.car.slug > y.car.slug ? 1 : 0))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function expectFullRanking(page: Page, direction: SortDirection) {
  const items = direction === "desc" ? highestFirst("insurance", {}, KEPT_ASSUMPTIONS) : ranking("insurance", {}, KEPT_ASSUMPTIONS);
  await expectRows(
    rankingList(page, listTitle(pl, "insurance", "year"), direction),
    items.slice(0, 10).map((item) => expectedRow(item, "insurance", "year", pl)),
  );
}

/** Presses `key` until `target` has focus. */
async function pressUntilFocused(page: Page, target: Locator, key: string, maxStops = 80): Promise<void> {
  for (let stop = 0; stop < maxStops; stop++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target, `focus reached the button with ${key}`).toBeFocused();
}

/** The "Filtry" button that opens the sheet (below 1024 px). */
function filtersTrigger(page: Page, locale: Locale): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(msg(locale, "filters.title"))}`) });
}

/**
 * A disabled button must not act. An enabled one would drop `limit` and announce the
 * clear, so after this pause the address and the status still being as before shows that
 * nothing ran.
 */
async function expectNothingHappened(page: Page, panel: Locator, query: string[]) {
  await page.waitForTimeout(1000);
  expect(queryOf(page)).toEqual([...query].sort());
  await expect(panelClearStatus(panel)).toHaveText("");
}

test.describe("clear filters in the filter panel", () => {
  test("removes every filter and the page size and keeps metric, order, period and assumptions", async ({ page }) => {
    expect(ranking("insurance", {}, KEPT_ASSUMPTIONS).length).toBeGreaterThan(10);
    await visit(page, `/pl/rankings?${[...KEPT, ...FILTERS].join("&")}`);
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    await interactive(clear);
    await expect(clear).not.toHaveAttribute("aria-disabled", "true");

    await clear.click();
    await expectQuery(page, KEPT);
    await expectFullRanking(page, "desc");
    await expect(
      page.getByRole("main").getByText(msg(pl, "common.cars", { count: ranking("insurance", {}, KEPT_ASSUMPTIONS).length }), {
        exact: true,
      }),
    ).toBeVisible();

    // The panel shows no filter any more.
    await expect(panel.getByRole("checkbox", { checked: true })).toHaveCount(0);
    for (const name of ["filters.query", "filters.priceMin", "filters.priceMax"]) {
      await expect(panel.getByRole("textbox", { name: msg(pl, name), exact: true })).toHaveValue("");
    }
    // Neither do the chips under the title.
    await expect(page.getByRole("main").getByRole("list", { name: msg(pl, "filters.activeList"), exact: true })).toHaveCount(0);
  });

  test("keeps focus on the button, turns it disabled and announces the result", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price&dir=desc&fuel=ev&body=suv");
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    const status = panelClearStatus(panel);
    await interactive(clear);
    await expect(status).toHaveText("");

    await clear.click();
    await expectQuery(page, ["dir=desc", "metric=price"]);
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await expect(clear).toBeFocused();
    await expect(status).toHaveText(msg(pl, "filters.cleared"));
    await expect(status).toHaveText("Filtry wyczyszczone");
    // Still a button in the page, not removed and not natively disabled.
    await expect(clear).toBeVisible();
    await expect(clear).not.toHaveAttribute("disabled");
  });

  test("Enter on the button clears the filters from the keyboard", async ({ page, isMobile }) => {
    await visit(page, "/pl/rankings?metric=price&gear=automatic&q=sport");
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    await interactive(clear);
    await pressUntilFocused(page, clear, isMobile ? "Shift+Tab" : "Tab");

    await page.keyboard.press("Enter");
    await expectQuery(page, ["metric=price"]);
    await expect(clear).toBeFocused();
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await expect(panelClearStatus(panel)).toHaveText(msg(pl, "filters.cleared"));
  });

  test("with no filter on, the button is shown disabled, can be focused, and does nothing", async ({ page, isMobile }) => {
    const query = ["metric=price", "dir=desc", "km=20000", "limit=20"];
    await visit(page, `/pl/rankings?${query.join("&")}`);
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    await interactive(clear);
    await expect(clear).toBeVisible();
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await expect(clear).not.toHaveAttribute("disabled");

    // Reached with the keyboard, with a visible focus ring.
    await pressUntilFocused(page, clear, isMobile ? "Shift+Tab" : "Tab");
    await expect(clear).toBeFocused();
    const outline = await clear.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style, "focus ring style").not.toBe("none");
    expect(outline.width, "focus ring width in px").toBeGreaterThanOrEqual(2);

    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await expect(clear).toBeFocused();
    await expectNothingHappened(page, panel, query);

    // Playwright treats aria-disabled as disabled, so the click is forced.
    await clear.click({ force: true });
    await expectNothingHappened(page, panel, query);
    await expect(clear).toHaveAttribute("aria-disabled", "true");
  });

  test("a make that is not in the catalogue does not count as a filter", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price&make=NoSuchMake");
    const { panel } = await openFilters(page);
    await expect(panelClearButton(panel, pl)).toHaveAttribute("aria-disabled", "true");
  });

  test("the next filter change empties the status, and clearing again announces it again", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price&fuel=ev");
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    const status = panelClearStatus(panel);
    await interactive(clear);

    await clear.click();
    await expectQuery(page, ["metric=price"]);
    await expect(status).toHaveText(msg(pl, "filters.cleared"));

    const hybrid = filterOption(panel, msg(pl, "attr.fuel.hybrid"));
    await interactive(hybrid);
    await hybrid.click();
    await expectQuery(page, ["fuel=hybrid", "metric=price"]);
    await expect(status).toHaveText("");
    await expect(clear).not.toHaveAttribute("aria-disabled", "true");

    await clear.click();
    await expectQuery(page, ["metric=price"]);
    await expect(status).toHaveText(msg(pl, "filters.cleared"));
    await expect(clear).toBeFocused();
  });

  test("in English the button and the status are in English", async ({ page }) => {
    await visit(page, "/en/rankings?dir=desc&fuel=ev&period=year");
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, "en");
    await expect(clear).toHaveText("Clear filters");
    await interactive(clear);
    await clear.click();
    await expectQuery(page, ["dir=desc", "period=year"]);
    await expect(panelClearStatus(panel)).toHaveText("Filters cleared");
    await expect(panelClearStatus(panel)).toHaveText(msg("en", "filters.cleared"));
  });

  test("the other two clear actions (chips row, empty state) keep the order as well", async ({ page }) => {
    expect(ranking("price", { makes: ["Dacia"], bodyTypes: ["coupe"] })).toHaveLength(0);
    await visit(page, "/pl/rankings?metric=price&dir=desc&make=Dacia&body=coupe");
    const main = page.getByRole("main");
    const emptyAction = main.getByRole("link", { name: msg(pl, "filters.clear"), exact: true });
    await interactive(emptyAction);
    await emptyAction.click();
    await expectQuery(page, ["dir=desc", "metric=price"]);
    await expect(rankingList(page, listTitle(pl, "price"), "desc").getByRole("listitem")).toHaveCount(10);

    await visit(page, "/pl/rankings?metric=price&dir=desc&fuel=ev");
    const chipsClear = page
      .locator("[data-active-filters]")
      .getByRole("button", { name: msg(pl, "filters.clear"), exact: true });
    await interactive(chipsClear);
    await chipsClear.click();
    await expectQuery(page, ["dir=desc", "metric=price"]);
    await expect(rankingList(page, listTitle(pl, "price"), "desc").getByRole("listitem")).toHaveCount(10);
  });

  test("an order change right before clearing the filters keeps the order", async ({ page }) => {
    const held = await slowNavigations(page, 1500);
    await visit(page, "/pl/rankings?metric=price&fuel=ev&body=suv");
    await chooseOrder(page, "desc");
    const { panel } = await openFilters(page);
    const clear = panelClearButton(panel, pl);
    await interactive(clear);
    await clear.click();
    await expectQuery(page, ["dir=desc", "metric=price"]);
    await expectRows(
      rankingList(page, listTitle(pl, "price"), "desc"),
      highestFirst("price", {})
        .slice(0, 10)
        .map((item) => expectedRow(item, "price", "month", pl)),
    );
    expect(held(), "navigation responses held back").toBeGreaterThan(0);
  });
});

test.describe("clear filters in the filters sheet", () => {
  // The mobile project shows the bottom sheet; the desktop project is narrowed to 800 px,
  // where the same sheet is a drawer on the right.
  test.use({
    viewport: async ({ viewport, isMobile }, provide) => {
      await provide(isMobile ? viewport : { width: 800, height: 900 });
    },
  });

  test("opening the sheet focuses the close button, not the clear button", async ({ page }) => {
    await visit(page, "/pl/rankings?fuel=ev");
    const trigger = filtersTrigger(page, pl);
    await interactive(trigger);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: msg(pl, "filters.title") });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: msg(pl, "common.close"), exact: true })).toBeFocused();
    await expect(panelClearButton(dialog, pl)).toBeVisible();
    await expect(panelClearButton(dialog, pl)).not.toBeFocused();
  });

  test("the clear button in the sheet header clears, keeps focus in the open sheet, and the badge goes", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price&dir=desc&km=20000&make=Kia&gear=manual");
    const trigger = filtersTrigger(page, pl);
    await expect(trigger).toHaveAccessibleName(/^Filtry\s*2$/);
    const { panel: dialog, close } = await openFilters(page);
    await expect(dialog).toHaveJSProperty("open", true);
    const clear = panelClearButton(dialog, pl);
    await interactive(clear);

    await clear.click();
    await expectQuery(page, ["dir=desc", "km=20000", "metric=price"]);
    await expect(clear).toBeFocused();
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await expect(panelClearStatus(dialog)).toHaveText(msg(pl, "filters.cleared"));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox", { checked: true })).toHaveCount(0);

    await close();
    await expect(trigger).toHaveAccessibleName(msg(pl, "filters.title"));
  });

  test("with no filter on, the sheet shows the clear button disabled", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price");
    const { panel: dialog } = await openFilters(page);
    const clear = panelClearButton(dialog, pl);
    await expect(clear).toBeVisible();
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await pressUntilFocused(page, clear, "Shift+Tab");
    await page.keyboard.press("Enter");
    await expectNothingHappened(page, dialog, ["metric=price"]);
    await expect(dialog).toBeVisible();
  });
});
