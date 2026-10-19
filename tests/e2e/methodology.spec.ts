import { expect, test } from "./helpers/fixtures";
import { LOCALES, messages, msg, squash } from "./helpers/text";
import { readTable, visit } from "./helpers/ui";

test.describe("methodology", () => {
  for (const locale of LOCALES) {
    test(`lists the five data sources with links and licences (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/methodology`);
      const sources = messages(locale).methodology.sources.rows;
      expect(sources).toHaveLength(5);

      const table = page.getByRole("table", { name: msg(locale, "methodology.sources.caption") });
      await expect(table).toBeVisible();
      expect(await readTable(table)).toEqual(
        sources.map((source) => ({
          label: squash(source.name),
          cells: [source.what, source.updated, source.licence].map(squash),
        })),
      );
      for (const source of sources) {
        const link = table.getByRole("link", { name: source.name, exact: true });
        await expect(link).toHaveAttribute("href", source.url);
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
      await expect(table).toContainText("Licence Ouverte / Open Licence 2.0");
    });

    test(`explains the price conversion and the 10, 15 and 20% thresholds (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/methodology`);
      const sections = messages(locale).methodology.sections;
      const main = page.getByRole("main");

      const conversion = main.getByText(sections.prices.paragraphs[2], { exact: true });
      await expect(conversion).toBeVisible();
      await expect(conversion).toContainText("NBP");
      await expect(conversion).toContainText("20%");
      await expect(conversion).toContainText("23%");
      await expect(conversion).toContainText("euro");

      const income = main.getByRole("region", { name: sections.income.heading });
      await expect(income.getByRole("listitem")).toHaveText(sections.income.list);
      for (const threshold of ["10%", "15%", "20%"]) await expect(income).toContainText(threshold);
    });
  }

  test("the power section answers to the anchors of both languages", async ({ page }) => {
    for (const [locale, anchor, other] of [
      ["pl", "moc", "power"],
      ["en", "power", "moc"],
    ] as const) {
      await visit(page, `/${locale}/methodology#${anchor}`);
      const heading = page.getByRole("heading", { level: 2, name: messages(locale).methodology.sections.power.heading });
      await expect(heading).toBeInViewport();
      await expect(heading).toHaveAttribute("id", anchor);
      await expect(page.locator(`[id="${other}"]`)).toHaveCount(1);
      expect(msg(locale, "power.methodologyAnchor")).toBe(anchor);
    }
  });
});
