import { expectCarCosts, expectEarnings } from "./helpers/car";
import { assumptionsWith, cheapest, nameOf, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { exactly, LOCALES, longDate, msg, pln } from "./helpers/text";
import {
  choosePeriod,
  expectedRow,
  expectQuery,
  expectRows,
  expectSameDocument,
  listTitle,
  markDocument,
  openAssumptions,
  rankingList,
  setAgeBand,
  setCoverage,
  setMileage,
  setOwnPremium,
  setYears,
  slowNavigations,
  visit,
} from "./helpers/ui";

const pl = "pl" as const;
const petrol = cheapest((car) => car.fuelType === "petrol");
const electric = cheapest((car) => car.fuelType === "ev");
const plugIn = cheapest((car) => car.fuelType === "phev");

test.describe("car page", () => {
  for (const car of [petrol, electric, plugIn]) {
    test(`every cost equals the cost engine for the default assumptions (${car.fuelType})`, async ({ page }) => {
      await visit(page, `/pl/cars/${car.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(nameOf(car));
      await expectCarCosts(page, pl, car, assumptionsWith(), "month");
    });
  }

  test("each changed assumption updates the costs without loading another page", async ({ page }) => {
    await visit(page, `/pl/cars/${petrol.slug}`);
    await markDocument(page);
    const { panel, close } = await openAssumptions(page);

    await setMileage(panel, pl, 22000);
    await expectQuery(page, ["km=22000"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 22000 }), "month");

    await setYears(panel, pl, 2);
    await expectQuery(page, ["km=22000", "years=2"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 22000, years: 2 }), "month");

    await setAgeBand(panel, pl, "18-24");
    await expectQuery(page, ["age=18-24", "km=22000", "years=2"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 22000, years: 2, age: "18-24" }), "month");

    await setCoverage(panel, pl, "oc");
    await expectQuery(page, ["age=18-24", "cov=oc", "km=22000", "years=2"]);
    await expectCarCosts(
      page,
      pl,
      petrol,
      assumptionsWith({ km: 22000, years: 2, age: "18-24", coverage: "oc" }),
      "month",
    );

    await setOwnPremium(panel, pl, 1800);
    await expectQuery(page, ["ins=1800", "km=22000", "years=2"]);
    await close();
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 22000, years: 2, premium: 1800 }), "month");
    await expectSameDocument(page);
  });

  test("one year of ownership uses the singular wording", async ({ page }) => {
    await visit(page, `/pl/cars/${petrol.slug}?years=1`);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ years: 1 }), "month");
  });

  test("the yearly view shows the yearly amounts and twelve times the monthly incomes", async ({ page }) => {
    await visit(page, `/pl/cars/${petrol.slug}`);
    await choosePeriod(page, "year");
    await expectQuery(page, ["period=year"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith(), "year");
    await expectEarnings(page, pl, petrol, assumptionsWith(), "year");
  });

  for (const locale of LOCALES) {
    test(`the earnings scale shows four levels ending with the not-recommended level (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/cars/${electric.slug}`);
      await expectEarnings(page, locale, electric, assumptionsWith(), "month");
      const levels = page
        .getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })
        .getByRole("listitem");
      await expect(levels).toHaveCount(4);
      await expect(levels.last()).toContainText(locale === "pl" ? "niezalecane" : "not recommended");
      expect(msg(locale, "car.levels.not_recommended.label")).toBe(locale === "pl" ? "niezalecane" : "not recommended");
    });
  }

  for (const locale of LOCALES) {
    test(`the earnings notes name the shares 15, 20 and 25% (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/cars/${petrol.slug}`);
      const levels = page
        .getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })
        .getByRole("listitem");
      await expect(levels).toHaveCount(4);
      const notes =
        locale === "pl"
          ? [
              "zakup i paliwo zajmują do 15% dochodu",
              "zakup i paliwo zajmują 15–20% dochodu",
              "zakup i paliwo zajmują 20–25% dochodu",
              "zakup i paliwo zajmują ponad 25% dochodu",
            ]
          : [
              "purchase and fuel take up to 15% of income",
              "purchase and fuel take 15–20% of income",
              "purchase and fuel take 20–25% of income",
              "purchase and fuel take over 25% of income",
            ];
      for (const [index, note] of notes.entries()) await expect(levels.nth(index)).toContainText(note);
      await expect(levels.filter({ hasText: "10%" })).toHaveCount(0);
    });
  }

  test("the price carries the indicative marker, its date and a link to its source", async ({ page }) => {
    await visit(page, `/pl/cars/${petrol.slug}`);
    const main = page.getByRole("main");
    await expect(main.getByText(exactly(pln(petrol.listPricePln, pl)))).toBeVisible();
    await expect(main.getByText(msg(pl, "common.indicative"), { exact: true })).toBeVisible();
    await expect(main.getByText(msg(pl, "car.priceExplain"))).toBeVisible();
    await expect(main.getByRole("time").filter({ hasText: longDate(petrol.priceObservedAt, pl) })).toHaveAttribute(
      "datetime",
      petrol.priceObservedAt,
    );
    const source = main.getByRole("link", { name: msg(pl, "car.source") });
    await expect(source).toHaveAttribute("href", petrol.priceSourceUrl);
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("assumptions set on the rankings are kept on a car page and restored on a later visit", async ({ page }) => {
    await visit(page, "/pl/rankings");
    const { panel, close } = await openAssumptions(page);
    await setMileage(panel, pl, 30000);
    await close();
    await expectQuery(page, ["km=30000"]);

    const assumptions = assumptionsWith({ km: 30000 });
    const first = ranking("totalCost", {}, assumptions)[0].car;
    await rankingList(page, listTitle(pl, "totalCost")).getByRole("link", { name: `1. ${nameOf(first)}` }).click();
    await expect(page).toHaveURL(`/pl/cars/${first.slug}?km=30000`);
    await expectCarCosts(page, pl, first, assumptions, "month");

    // A later visit without parameters takes the stored assumptions.
    await visit(page, `/pl/cars/${petrol.slug}`);
    await expectQuery(page, ["km=30000"]);
    await expectCarCosts(page, pl, petrol, assumptions, "month");

    // So does the rankings page loaded again without parameters.
    await visit(page, "/pl/rankings");
    await expectQuery(page, ["km=30000"]);
    await expectRows(
      rankingList(page, listTitle(pl, "totalCost")),
      ranking("totalCost", {}, assumptions)
        .slice(0, 10)
        .map((item) => expectedRow(item, "totalCost", "month", pl)),
    );
  });

  test("links follow the stored assumptions applied on a later visit", async ({ page }) => {
    await visit(page, "/pl/rankings");
    const { panel, close } = await openAssumptions(page);
    await setMileage(panel, pl, 30000);
    await close();
    await expectQuery(page, ["km=30000"]);
    await visit(page, "/pl/methodology");

    await visit(page, `/pl/cars/${petrol.slug}`);
    await expectQuery(page, ["km=30000"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 30000 }), "month");

    const header = page.getByRole("banner");
    const footer = page.getByRole("contentinfo");
    const links = {
      "header: rankings": header.getByRole("link", { name: msg(pl, "header.rankings"), exact: true }),
      "header: methodology": header.getByRole("link", { name: msg(pl, "header.methodology"), exact: true }),
      "header: English": header.getByRole("link", { name: /^EN\b/ }),
      "footer: home": footer.getByRole("link", { name: msg(pl, "common.home"), exact: true }),
      "footer: rankings": footer.getByRole("link", { name: msg(pl, "header.rankings"), exact: true }),
      "back to rankings": page
        .getByRole("navigation", { name: msg(pl, "car.breadcrumb") })
        .getByRole("link", { name: msg(pl, "header.rankings") }),
    };
    for (const [where, link] of Object.entries(links)) {
      await expect(link, where).toHaveAttribute("href", /[?&]km=30000(&|#|$)/);
    }
  });

  test("a mileage change followed at once by the period switch keeps both", async ({ page }) => {
    const held = await slowNavigations(page, 600);
    await visit(page, `/pl/cars/${petrol.slug}`);
    const { panel, close } = await openAssumptions(page);
    await setMileage(panel, pl, 40000);
    await close();
    await choosePeriod(page, "year");
    await expectQuery(page, ["km=40000", "period=year"]);
    await expectCarCosts(page, pl, petrol, assumptionsWith({ km: 40000 }), "year");
    expect(held(), "navigation responses held back").toBeGreaterThan(0);
  });
});
