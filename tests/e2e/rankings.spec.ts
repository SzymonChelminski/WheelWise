import type { RankingFilters, RankingMetric } from "@/lib/costs";
import type { Page } from "@playwright/test";
import { assumptionsWith, METRICS, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { integer, msg, pln, squash } from "./helpers/text";
import {
  chooseMetric,
  choosePeriod,
  expectedRow,
  expectQuery,
  expectRows,
  expectSameDocument,
  filterOption,
  interactive,
  listTitle,
  markDocument,
  openAssumptions,
  openFilters,
  rankingList,
  setMileage,
  setYears,
  slowNavigations,
  toggleFilter,
  visit,
} from "./helpers/ui";

const pl = "pl" as const;

/** The list, the car count and the "shown of" line equal the ranking engine for these inputs. */
async function expectRanking(
  page: Page,
  metric: RankingMetric,
  filters: RankingFilters,
  options: { limit?: number; assumptions?: ReturnType<typeof assumptionsWith>; period?: "month" | "year" } = {},
) {
  const { limit = 10, assumptions = assumptionsWith(), period = "month" } = options;
  const ranked = ranking(metric, filters, assumptions);
  const electricOnly = filters.fuelTypes?.length === 1 && filters.fuelTypes[0] === "ev";
  const title = listTitle(pl, metric, period);
  await expect(page.getByRole("main").getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText(msg(pl, "common.cars", { count: ranked.length }), { exact: true })).toBeVisible();
  await expectRows(
    rankingList(page, title),
    ranked.slice(0, limit).map((item) => expectedRow(item, metric, period, pl, electricOnly)),
  );
}

async function reloadAndExpect(page: Page, check: () => Promise<void>) {
  const before = page.url();
  await page.reload();
  expect(page.url()).toBe(before);
  await check();
}

test.describe("rankings", () => {
  for (const metric of METRICS) {
    test(`the "${metric}" ranking lists the first ten cars of the cost engine`, async ({ page }) => {
      await visit(page, metric === "totalCost" ? "/pl/rankings" : `/pl/rankings?metric=${metric}`);
      await expectRanking(page, metric, {});
    });
  }

  test("the consumption ranking with only electric cars selected lists kWh per 100 km", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=fuelConsumption&fuel=ev");
    await expectRanking(page, "fuelConsumption", { fuelTypes: ["ev"] });
    await expect(page.getByText(msg(pl, "rankings.consumptionNoteElectric"))).toBeVisible();
  });

  test("every row shows the indicative price marker with the list price", async ({ page }) => {
    await visit(page, "/pl/rankings");
    const items = rankingList(page, listTitle(pl, "totalCost")).getByRole("listitem");
    await expect(items).toHaveCount(10);
    const texts = (await items.allTextContents()).map(squash);
    const expected = ranking("totalCost")
      .slice(0, 10)
      .map((item) => squash(`${msg(pl, "common.indicative")} ${pln(item.car.listPricePln, pl)}`));
    expect(texts.map((text, index) => (text.includes(expected[index]) ? expected[index] : text))).toEqual(expected);
  });

  test.describe("filters", () => {
    test("by powertrain", async ({ page }) => {
      await visit(page, "/pl/rankings");
      await toggleFilter(page, msg(pl, "attr.fuel.ev"));
      await expectQuery(page, ["fuel=ev"]);
      const check = () => expectRanking(page, "totalCost", { fuelTypes: ["ev"] });
      await check();
      await reloadAndExpect(page, check);
    });

    test("by segment", async ({ page }) => {
      await visit(page, "/pl/rankings");
      await toggleFilter(page, msg(pl, "attr.segment.A"));
      await expectQuery(page, ["segment=A"]);
      const check = () => expectRanking(page, "totalCost", { segments: ["A"] });
      await check();
      await reloadAndExpect(page, check);
    });

    test("by make", async ({ page }) => {
      await visit(page, "/pl/rankings");
      await toggleFilter(page, "Kia");
      await expectQuery(page, ["make=Kia"]);
      const check = () => expectRanking(page, "totalCost", { makes: ["Kia"] });
      await check();
      await reloadAndExpect(page, check);
    });

    test("by price range", async ({ page }) => {
      await visit(page, "/pl/rankings");
      const { panel, close } = await openFilters(page);
      const from = panel.getByRole("textbox", { name: msg(pl, "filters.priceMin"), exact: true });
      await interactive(from);
      await from.fill("80000");
      await from.press("Tab");
      const to = panel.getByRole("textbox", { name: msg(pl, "filters.priceMax"), exact: true });
      await to.fill("120000");
      await to.press("Tab");
      await close();
      await expectQuery(page, ["pmax=120000", "pmin=80000"]);
      const check = () => expectRanking(page, "totalCost", { priceMin: 80000, priceMax: 120000 });
      await check();
      await reloadAndExpect(page, check);
    });

    test("by text query", async ({ page }) => {
      await visit(page, "/pl/rankings");
      const { panel, close } = await openFilters(page);
      const query = panel.getByRole("textbox", { name: msg(pl, "filters.query"), exact: true });
      await interactive(query);
      await query.fill("clio");
      await query.press("Tab");
      await close();
      await expectQuery(page, ["q=clio"]);
      const check = () => expectRanking(page, "totalCost", { query: "clio" });
      await check();
      await reloadAndExpect(page, check);
    });

    test("by two filters combined", async ({ page }) => {
      await visit(page, "/pl/rankings");
      await toggleFilter(page, msg(pl, "attr.fuel.hybrid"));
      await expectQuery(page, ["fuel=hybrid"]);
      await toggleFilter(page, msg(pl, "attr.body.suv"));
      await expectQuery(page, ["body=suv", "fuel=hybrid"]);
      const check = () => expectRanking(page, "totalCost", { fuelTypes: ["hybrid"], bodyTypes: ["suv"] });
      await check();
      await reloadAndExpect(page, check);
    });
  });

  test("show more adds ten rows", async ({ page }) => {
    await visit(page, "/pl/rankings");
    const total = ranking("totalCost").length;
    await expect(page.getByText(msg(pl, "rankings.showing", { shown: integer(10, pl), total: integer(total, pl) }))).toBeVisible();
    const more = page.getByRole("link", { name: msg(pl, "rankings.showMore"), exact: true });
    await interactive(more);
    await more.click();
    await expectQuery(page, ["limit=20"]);
    await expectRanking(page, "totalCost", {}, { limit: 20 });
    await expect(page.getByText(msg(pl, "rankings.showing", { shown: integer(20, pl), total: integer(total, pl) }))).toBeVisible();
  });

  test("an empty result shows the empty state and clearing the filters brings the list back", async ({ page }) => {
    await visit(page, "/pl/rankings?make=Dacia");
    expect(ranking("totalCost", { makes: ["Dacia"], bodyTypes: ["coupe"] })).toHaveLength(0);
    await toggleFilter(page, msg(pl, "attr.body.coupe"));
    await expectQuery(page, ["body=coupe", "make=Dacia"]);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 3, name: msg(pl, "rankings.emptyTitle") })).toBeVisible();
    await expect(main.getByText(msg(pl, "common.cars", { count: 0 }), { exact: true })).toBeVisible();

    const clear = main.getByRole("link", { name: msg(pl, "filters.clear"), exact: true });
    await interactive(clear);
    await clear.click();
    await expectQuery(page, []);
    await expectRanking(page, "totalCost", {});
  });

  test("changing the mileage and the ownership period gives the expected values", async ({ page }) => {
    await visit(page, "/pl/rankings");
    const { panel, close } = await openAssumptions(page);
    await setMileage(panel, pl, 25000);
    await setYears(panel, pl, 3);
    await close();
    await expectQuery(page, ["km=25000", "years=3"]);
    const assumptions = assumptionsWith({ km: 25000, years: 3 });
    await expectRanking(page, "totalCost", {}, { assumptions });
    const summary = msg(pl, "assumptions.summaryEstimate", {
      km: integer(25000, pl),
      years: msg(pl, "assumptions.yearsValue", { count: 3 }),
      coverage: msg(pl, "assumptions.coverageShort.oc_ac"),
      age: msg(pl, "assumptions.ageBands.35-44"),
    });
    await expect(page.getByRole("main").getByText(summary)).toBeVisible();
  });

  test("the yearly view shows the yearly amounts", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=insurance");
    await choosePeriod(page, "year");
    await expectQuery(page, ["metric=insurance", "period=year"]);
    await expectRanking(page, "insurance", {}, { period: "year" });
  });

  test("links on the page carry the mileage as soon as it changes", async ({ page }) => {
    await visit(page, "/pl/rankings");
    await markDocument(page);
    const { panel, close } = await openAssumptions(page);
    await setMileage(panel, pl, 20000);
    await close();
    await expectQuery(page, ["km=20000"]);
    await expectSameDocument(page);

    const header = page.getByRole("banner");
    const footer = page.getByRole("contentinfo");
    const main = page.getByRole("main");
    const hrefs: Record<string, ReturnType<typeof page.getByRole>> = {
      "header: rankings": header.getByRole("link", { name: msg(pl, "header.rankings"), exact: true }),
      "header: comparison": header.getByRole("link", { name: msg(pl, "header.compare"), exact: true }),
      "header: methodology": header.getByRole("link", { name: msg(pl, "header.methodology"), exact: true }),
      "header: English": header.getByRole("link", { name: /^EN\b/ }),
      "footer: home": footer.getByRole("link", { name: msg(pl, "common.home"), exact: true }),
      "footer: rankings": footer.getByRole("link", { name: msg(pl, "header.rankings"), exact: true }),
      "footer: comparison": footer.getByRole("link", { name: msg(pl, "header.compare"), exact: true }),
      "footer: methodology": footer.getByRole("link", { name: msg(pl, "header.methodology"), exact: true }),
      "first car": rankingList(page, listTitle(pl, "totalCost")).getByRole("link").first(),
      "estimate note: methodology": main.getByRole("link", { name: msg(pl, "common.howWeCount"), exact: true }),
      "power note": main.getByRole("link", { name: msg(pl, "power.methodologyLink"), exact: true }),
    };
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      hrefs["metric: price"] = page
        .getByRole("navigation", { name: msg(pl, "rankings.metricLabel") })
        .getByRole("link", { name: msg(pl, "metrics.price.label"), exact: true });
    }

    for (const [where, link] of Object.entries(hrefs)) {
      await expect(link, where).toHaveAttribute("href", /[?&]km=20000(&|#|$)/);
    }
    await expect(hrefs["power note"]).toHaveAttribute("href", "/pl/methodology?km=20000#moc");
    await expect(hrefs["header: English"]).toHaveAttribute("href", "/en/rankings?km=20000");
    await expectSameDocument(page);
  });

  test.describe("clicks faster than the server", () => {
    test("a filter, a metric and another filter all end in the address and the list", async ({ page }) => {
      const held = await slowNavigations(page, 600);
      await visit(page, "/pl/rankings");
      await toggleFilter(page, msg(pl, "attr.fuel.ev"));
      await chooseMetric(page, "price");
      await toggleFilter(page, msg(pl, "attr.body.suv"));
      await expectQuery(page, ["body=suv", "fuel=ev", "metric=price"]);
      await expectRanking(page, "price", { fuelTypes: ["ev"], bodyTypes: ["suv"] });
      expect(held(), "navigation responses held back").toBeGreaterThan(0);
    });

    test("the header link to the rankings drops the filters, a chip clicked after it stays alone", async ({ page }) => {
      const held = await slowNavigations(page, 600);
      await visit(page, "/pl/rankings?fuel=ev");
      const header = page
        .getByRole("banner")
        .getByRole("link", { name: msg(pl, "header.rankings"), exact: true });
      await interactive(header);
      await header.click();
      const { panel, close } = await openFilters(page);
      const suv = filterOption(panel, msg(pl, "attr.body.suv"));
      await expect(filterOption(panel, msg(pl, "attr.fuel.ev"))).not.toBeChecked();
      await suv.click();
      await close();
      await expectQuery(page, ["body=suv"]);
      await expectRanking(page, "totalCost", { bodyTypes: ["suv"] });
      expect(held(), "navigation responses held back").toBeGreaterThan(0);
    });
  });
});
