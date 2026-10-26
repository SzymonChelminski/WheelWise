import {
  affordabilityOf,
  earningsIntroText,
  earningsSection,
  expectCarCosts,
  expectEarnings,
  expectedEarningsAmount,
  expectedLevels,
  LEVEL_TEXTS,
  readEarnings,
} from "./helpers/car";
import { assumptionsWith, cheapest, costsOf } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { exactly, LOCALES, msg, squash } from "./helpers/text";
import { choosePeriod, expectQuery, openAssumptions, setOwnPremium, setYears, visit } from "./helpers/ui";

/*
 * The earnings scale on the car page is based on the purchase price spread over the
 * months of ownership plus the monthly fuel or energy cost, not on the total cost.
 */

const petrol = cheapest((car) => car.fuelType === "petrol");
const electric = cheapest((car) => car.fuelType === "ev");
const plugIn = cheapest((car) => car.fuelType === "phev");

test.describe("earnings scale base", () => {
  for (const locale of LOCALES) {
    for (const car of [petrol, electric, plugIn]) {
      test(`the amount is price / 60 months + monthly fuel and the ranges follow it (${car.fuelType}, ${locale})`, async ({
        page,
      }) => {
        const assumptions = assumptionsWith();
        const costs = costsOf(car, assumptions);
        // Preconditions: the new base differs from the total cost, so the old base would be caught.
        expect(affordabilityOf(car, assumptions)).toBeCloseTo(car.listPricePln / 60 + costs.perMonth.fuel, 6);
        expect(expectedLevels(locale, affordabilityOf(car, assumptions), "month")).not.toEqual(
          expectedLevels(locale, costs.perMonth.total, "month"),
        );

        await visit(page, `/${locale}/cars/${car.slug}`);
        await expectEarnings(page, locale, car, assumptions, "month");
      });
    }

    test(`the yearly view shows twelve times the monthly amount and ranges (${locale})`, async ({ page }) => {
      const assumptions = assumptionsWith();
      await visit(page, `/${locale}/cars/${electric.slug}`);
      await expectEarnings(page, locale, electric, assumptions, "month");
      const monthly = await readEarnings(page, locale);

      await choosePeriod(page, "year");
      await expectQuery(page, ["period=year"]);
      await expectEarnings(page, locale, electric, assumptions, "year");
      const yearly = await readEarnings(page, locale);
      expect(yearly).not.toEqual(monthly);

      // Each bound of the yearly view is twelve times the bound of the monthly view.
      const bounds = (texts: string[]) =>
        texts.flatMap((text) => [...text.matchAll(/(\d[\d\s,]*)\szł/g)].map((m) => Number(m[1].replace(/[\s,]/g, ""))));
      expect(bounds(yearly)).toEqual(bounds(monthly).map((value) => value * 12));
      expect(bounds(monthly)).toHaveLength(6);
    });

    test(`?years=10 spreads the price over 120 months (${locale})`, async ({ page }) => {
      const five = assumptionsWith();
      const ten = assumptionsWith({ years: 10 });
      // 10 years halve the purchase part: the amount drops by price / 120.
      expect(affordabilityOf(petrol, five) - affordabilityOf(petrol, ten)).toBeCloseTo(petrol.listPricePln / 120, 6);
      expect(expectedEarningsAmount(locale, petrol, ten, "month")).not.toBe(
        expectedEarningsAmount(locale, petrol, five, "month"),
      );

      await visit(page, `/${locale}/cars/${petrol.slug}?years=10`);
      await expectEarnings(page, locale, petrol, ten, "month");

      await visit(page, `/${locale}/cars/${petrol.slug}?years=10&period=year`);
      await expectEarnings(page, locale, petrol, ten, "year");
    });

    test(`changing the ownership period in the assumptions updates the scale at once (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/cars/${petrol.slug}`);
      await expectEarnings(page, locale, petrol, assumptionsWith(), "month");
      const { panel, close } = await openAssumptions(page);
      await setYears(panel, locale, 1);
      await expectQuery(page, ["years=1"]);
      await close();
      await expectEarnings(page, locale, petrol, assumptionsWith({ years: 1 }), "month");
    });
  }

  test("a custom insurance premium changes the total cost but not the earnings ranges", async ({ page }) => {
    const base = assumptionsWith();
    const own = assumptionsWith({ premium: 20000 });
    // Precondition: the premium really changes the total cost of the car.
    expect(Math.round(costsOf(petrol, own).perMonth.total)).not.toBe(Math.round(costsOf(petrol, base).perMonth.total));
    expect(affordabilityOf(petrol, own)).toBe(affordabilityOf(petrol, base));

    await visit(page, `/pl/cars/${petrol.slug}`);
    await expectCarCosts(page, "pl", petrol, base, "month");
    await expectEarnings(page, "pl", petrol, base, "month");
    const before = await readEarnings(page, "pl");

    await visit(page, `/pl/cars/${petrol.slug}?ins=20000`);
    await expectCarCosts(page, "pl", petrol, own, "month");
    await expectEarnings(page, "pl", petrol, own, "month");
    expect(await readEarnings(page, "pl")).toEqual(before);
  });

  test("entering an own premium in the assumptions leaves the earnings ranges as they were (en)", async ({ page }) => {
    await visit(page, `/en/cars/${plugIn.slug}`);
    await expectEarnings(page, "en", plugIn, assumptionsWith(), "month");
    const before = await readEarnings(page, "en");

    const { panel, close } = await openAssumptions(page);
    await setOwnPremium(panel, "en", 15000);
    await expectQuery(page, ["ins=15000"]);
    await close();
    await expectCarCosts(page, "en", plugIn, assumptionsWith({ premium: 15000 }), "month");
    expect(await readEarnings(page, "en")).toEqual(before);
    await expectEarnings(page, "en", plugIn, assumptionsWith({ premium: 15000 }), "month");
  });
});

test.describe("earnings texts", () => {
  for (const locale of LOCALES) {
    test(`the level labels, notes and both sentences above the scale equal the design (${locale})`, async ({
      page,
    }) => {
      const assumptions = assumptionsWith();
      await visit(page, `/${locale}/cars/${petrol.slug}`);
      const section = earningsSection(page, locale);
      const levels = section.getByRole("listitem");
      await expect(levels).toHaveCount(4);
      for (const [index, { label, note }] of LEVEL_TEXTS[locale].entries()) {
        const item = levels.nth(index);
        await expect(item.locator("p").nth(0)).toHaveText(label);
        await expect(item.locator("p").nth(2)).toHaveText(note);
      }

      const sr = msg(locale, "common.estimateSr");
      const monthAmount = `≈${sr} ${expectedEarningsAmount(locale, petrol, assumptions, "month")}`;
      await expect(section.getByText(exactly(earningsIntroText(locale, "month", monthAmount)))).toBeVisible();

      await choosePeriod(page, "year");
      const yearAmount = `≈${sr} ${expectedEarningsAmount(locale, petrol, assumptions, "year")}`;
      await expect(section.getByText(exactly(earningsIntroText(locale, "year", yearAmount)))).toBeVisible();
      for (const [index, { note }] of LEVEL_TEXTS[locale].entries()) {
        await expect(levels.nth(index).locator("p").nth(2)).toHaveText(note);
      }

      // The old wording that named the whole cost of the car is gone.
      const text = squash(await section.textContent());
      for (const old of ["auto zajmuje", "the car takes", "koszt ", "a cost of"]) expect(text).not.toContain(old);
    });
  }
});
