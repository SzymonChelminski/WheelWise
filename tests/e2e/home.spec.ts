import { METRICS, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { LOCALES, msg } from "./helpers/text";
import { expectRows, expectedRow, listTitle, rankingList, visit } from "./helpers/ui";

test.describe("home page", () => {
  for (const locale of LOCALES) {
    test(`shows the five cheapest cars to buy and the five lowest total costs (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg(locale, "home.title"));

      const byPrice = ranking("price").slice(0, 5);
      await expectRows(
        rankingList(page, msg(locale, "home.topPriceTitle")),
        byPrice.map((item) => expectedRow(item, "price", "month", locale)),
      );

      const byCost = ranking("totalCost").slice(0, 5);
      await expectRows(
        rankingList(page, msg(locale, "home.topCostTitle")),
        byCost.map((item) => expectedRow(item, "totalCost", "month", locale)),
      );
    });
  }

  test("links to each of the nine rankings", async ({ page }) => {
    await visit(page, "/pl");
    const section = page.getByRole("region", { name: msg("pl", "home.allRankingsTitle") });

    for (const metric of METRICS) {
      const label = msg("pl", `metrics.${metric}.label`);
      const link = section.getByRole("link", { name: new RegExp(`^${label}`) });
      const expectedPath = metric === "totalCost" ? "/pl/rankings" : `/pl/rankings?metric=${metric}`;
      await expect(link).toHaveAttribute("href", expectedPath);

      await link.click();
      await expect(page).toHaveURL(expectedPath);
      await expect(page.getByRole("main").getByRole("heading", { level: 2, name: listTitle("pl", metric) })).toBeVisible();
      await expectRows(
        rankingList(page, listTitle("pl", metric)),
        ranking(metric).slice(0, 10).map((item) => expectedRow(item, metric, "month", "pl")),
      );
      await page.goBack();
      await expect(page).toHaveURL("/pl");
    }
  });
});
