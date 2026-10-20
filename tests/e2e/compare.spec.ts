import { assumptionsWith, cheapest, nameOf, ranking } from "./helpers/catalogue";
import { comparisonTable, expectComparison, expectedComparison } from "./helpers/comparison";
import { expect, test } from "./helpers/fixtures";
import { msg } from "./helpers/text";
import {
  choosePeriod,
  compareBar,
  compareToggle,
  expectQuery,
  interactive,
  listTitle,
  rankingList,
  visit,
} from "./helpers/ui";

const pl = "pl" as const;
const defaults = assumptionsWith();
const petrol = cheapest((car) => car.fuelType === "petrol");
const electric = cheapest((car) => car.fuelType === "ev");
const hybrid = cheapest((car) => car.fuelType === "hybrid");
const diesel = cheapest((car) => car.fuelType === "diesel");

test.describe("comparison", () => {
  test("two cars added from the rankings are compared; a third fits, a fourth is refused", async ({ page }) => {
    const [first, second, third, fourth] = ranking("totalCost")
      .slice(0, 4)
      .map((item) => item.car);
    await visit(page, "/pl/rankings");
    const list = rankingList(page, listTitle(pl, "totalCost"));
    const bar = compareBar(page);

    // Several cars can share a name, so each toggle is found in the row of its car.
    for (const [index, car] of [first, second].entries()) {
      const row = list.getByRole("listitem").nth(index);
      const toggle = compareToggle(row, pl, car);
      await interactive(toggle);
      await toggle.click();
      await expect(compareToggle(row, pl, car, true)).toHaveAttribute("aria-pressed", "true");
    }
    await expect(bar.disclosure(2)).toBeVisible();
    await bar.compareLink(2).click();
    await expect(page).toHaveURL(`/pl/compare?cars=${first.slug},${second.slug}`);
    await expectComparison(page, pl, [first, second], defaults, "month");

    // The third car comes from the search on the comparison page.
    const picker = page
      .getByRole("region", { name: msg(pl, "compare.addThirdTitle") })
      .getByRole("combobox", { name: msg(pl, "search.label") });
    await interactive(picker);
    await picker.fill(nameOf(third));
    // Two cars can share a name; the attributes printed with it tell them apart.
    const option = page
      .getByRole("option")
      .filter({ hasText: nameOf(third) })
      .filter({ hasText: msg(pl, `attr.transmission.${third.transmission}`) })
      .filter({ hasText: `${Math.round(third.powerKw * 1.35962)} KM` });
    await expect(option).toHaveCount(1);
    await option.click();
    await expectQuery(page, [`cars=${first.slug},${second.slug},${third.slug}`]);
    await expectComparison(page, pl, [first, second, third], defaults, "month");
    await expect(bar.disclosure(3)).toBeVisible();

    // Back on the rankings every other toggle is full; trying one shows the limit message.
    await visit(page, "/pl/rankings");
    const full = compareToggle(
      rankingList(page, listTitle(pl, "totalCost")).getByRole("listitem").nth(3),
      pl,
      fourth,
    );
    await expect(full).toHaveAttribute("aria-disabled", "true");
    await interactive(full);
    // The toggle keeps its focus and its action while it looks disabled.
    await full.press("Enter");
    await expect(compareBar(page).hint).toHaveText(msg(pl, "compareBar.limit"));
    await expect(full).toHaveAttribute("aria-pressed", "false");
    await expect(compareBar(page).disclosure(3)).toBeVisible();
  });

  test("the best value of each row is marked in words, ties are not", async ({ page }) => {
    const cars = [petrol, electric, hybrid];
    await visit(page, `/pl/compare?cars=${cars.map((car) => car.slug).join(",")}`);
    await expectComparison(page, pl, cars, defaults, "month");
    const rows = expectedComparison(pl, cars, defaults, "month");
    const marked = rows.filter((row) => row.cells.some((cell) => /najni[żz]ej|najwy[żz]ej/.test(cell)));
    expect(marked.length, "rows with a marked value").toBeGreaterThan(5);

    // Two petrol cars: the consumption row is comparable and marked too.
    const twoPetrol = [petrol, cheapest((car) => car.fuelType === "petrol" && car.slug !== petrol.slug)];
    await visit(page, `/pl/compare?cars=${twoPetrol.map((car) => car.slug).join(",")}`);
    await expectComparison(page, pl, twoPetrol, defaults, "month");
  });

  test("removing cars updates the address and the table, and one car leaves the empty state", async ({ page }) => {
    const cars = [petrol, diesel, hybrid];
    await visit(page, `/pl/compare?cars=${cars.map((car) => car.slug).join(",")}`);
    await expectComparison(page, pl, cars, defaults, "month");

    const remove = (name: string) =>
      page.getByRole("main").getByRole("button", { name: `${msg(pl, "compare.remove")}: ${name}`, exact: true });
    await interactive(remove(nameOf(diesel)));
    await remove(nameOf(diesel)).click();
    await expectQuery(page, [`cars=${petrol.slug},${hybrid.slug}`]);
    await expectComparison(page, pl, [petrol, hybrid], defaults, "month");

    await remove(nameOf(petrol)).click();
    await expectQuery(page, [`cars=${hybrid.slug}`]);
    await expect(page.getByRole("heading", { name: msg(pl, "compare.emptyOneTitle") })).toBeVisible();
    await expect(comparisonTable(page, pl, "month")).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: msg(pl, "compare.emptyOneTitle") })).toBeVisible();
  });

  test("without cars the empty state offers the search and the rankings", async ({ page }) => {
    await visit(page, "/pl/compare");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: msg(pl, "compare.emptyTitle") })).toBeVisible();
    await expect(main.getByRole("combobox", { name: msg(pl, "search.label") })).toBeVisible();
    await expect(main.getByRole("link", { name: msg(pl, "compare.toRankings"), exact: true })).toHaveAttribute(
      "href",
      "/pl/rankings",
    );
  });

  test("unknown cars and a fourth car in the address are ignored", async ({ page }) => {
    const four = [petrol, diesel, hybrid, electric];
    await visit(
      page,
      `/pl/compare?cars=no-such-car,${four[0].slug},${four[1].slug},Not%20A%20Slug,${four[2].slug},${four[3].slug}`,
    );
    await expectComparison(page, pl, four.slice(0, 3), defaults, "month");

    await visit(page, `/pl/compare?cars=${petrol.slug},no-such-car`);
    await expect(page.getByRole("heading", { name: msg(pl, "compare.emptyOneTitle") })).toBeVisible();
  });

  test("a former car address kept in the stored comparison is dropped without an error or an empty place", async ({
    page,
  }) => {
    const oldSlug = "renault-clio-sedan-hatchback-diesel-manual-74kw";
    await visit(page, "/pl/methodology");
    await page.evaluate(
      ([key, slugs]) => window.localStorage.setItem(key, JSON.stringify(slugs)),
      ["wheelwise.compare.v1", [oldSlug, petrol.slug]] as const,
    );

    await visit(page, "/pl/rankings");
    const bar = compareBar(page);
    await expect(bar.disclosure(1)).toBeVisible();
    await expect(bar.disclosure(2)).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("wheelwise.compare.v1")))
      .toBe(JSON.stringify([petrol.slug]));
    await interactive(bar.disclosure(1));
    await bar.disclosure(1).click();
    await expect(bar.removeButton(nameOf(petrol))).toBeVisible();
    await expect(bar.region.getByRole("listitem")).toHaveCount(1);

    // The comparison page restores the stored cars without the former address.
    await page.evaluate(
      ([key, slugs]) => window.localStorage.setItem(key, JSON.stringify(slugs)),
      ["wheelwise.compare.v1", [oldSlug, petrol.slug, electric.slug]] as const,
    );
    await visit(page, "/pl/compare");
    await expectQuery(page, [`cars=${petrol.slug},${electric.slug}`]);
    await expectComparison(page, pl, [petrol, electric], defaults, "month");
  });

  test("the yearly view shows the yearly amounts", async ({ page }) => {
    const cars = [petrol, electric];
    await visit(page, `/pl/compare?cars=${cars.map((car) => car.slug).join(",")}`);
    await choosePeriod(page, "year");
    await expectQuery(page, [`cars=${petrol.slug},${electric.slug}`, "period=year"]);
    await expectComparison(page, pl, cars, defaults, "year");
  });

  test("the comparison bar keeps the same room under the footer open or closed", async ({ page, isMobile }) => {
    await visit(page, "/pl/rankings");
    const car = ranking("totalCost")[0].car;
    const toggle = compareToggle(rankingList(page, listTitle(pl, "totalCost")).getByRole("listitem").first(), pl, car);
    await interactive(toggle);
    await toggle.click();

    const bar = compareBar(page);
    const disclosure = bar.disclosure(1);
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    const footer = page.getByRole("contentinfo");
    const padding = () => footer.evaluate((element) => getComputedStyle(element).paddingBottom);
    const closedHeight = await bar.region.evaluate((element) => (element as HTMLElement).offsetHeight);
    expect(closedHeight).toBeGreaterThan(0);
    await expect.poll(padding).toBe(`${closedHeight}px`);

    await interactive(disclosure);
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(bar.removeButton(nameOf(car))).toBeVisible();
    expect(await padding()).toBe(`${closedHeight}px`);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    const home = footer.getByRole("link", { name: msg(pl, "common.home"), exact: true });
    if (isMobile) await home.tap();
    else await home.click();
    await expect(page).toHaveURL("/pl");
  });
});
