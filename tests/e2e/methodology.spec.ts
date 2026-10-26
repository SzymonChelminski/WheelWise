import { expect, test } from "./helpers/fixtures";
import { LOCALES, messages, msg, squash } from "./helpers/text";
import { readTable, visit } from "./helpers/ui";

test.describe("methodology", () => {
  for (const locale of LOCALES) {
    test(`lists the six data sources with links and licences, Wikimedia Commons last (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/methodology`);
      const sources = messages(locale).methodology.sources.rows;
      expect(sources).toHaveLength(6);
      expect(sources[5]).toEqual(
        locale === "pl"
          ? {
              name: "Wikimedia Commons",
              url: "https://commons.wikimedia.org/",
              what: "Zdjęcia modeli aut",
              updated: "ręcznie, gdy w katalogu pojawiają się nowe modele",
              licence: "CC BY-SA / CC BY / CC0 / domena publiczna, osobno dla każdego zdjęcia",
            }
          : {
              name: "Wikimedia Commons",
              url: "https://commons.wikimedia.org/",
              what: "Photos of car models",
              updated: "by hand, when new models enter the catalogue",
              licence: "CC BY-SA / CC BY / CC0 / public domain, per photo",
            },
      );

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
      await expect(table.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveAttribute(
        "href",
        "https://commons.wikimedia.org/",
      );
    });

    test(`says that car photos are illustrative and come from Wikimedia Commons (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/methodology`);
      const sentence =
        locale === "pl"
          ? "Zdjęcia aut są poglądowe: pokazują model, niekoniecznie tę samą wersję lub generację, i pochodzą z Wikimedia Commons. Autora i licencję każdego zdjęcia podajemy pod nim."
          : "Car photos are illustrative: they show the model, not necessarily the same version or generation, and come from Wikimedia Commons. The author and licence of each photo are given under it.";
      const paragraphs = messages(locale).methodology.sections.prices.paragraphs;
      expect(paragraphs[paragraphs.length - 1]).toBe(sentence);
      await expect(page.getByRole("main").getByText(sentence, { exact: true })).toBeVisible();
    });

    test(`explains the price conversion and the 15, 20 and 25% thresholds (${locale})`, async ({ page }) => {
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
      expect(sections.income.list).toEqual(
        locale === "pl"
          ? [
              "komfortowo: zakup i paliwo zajmują do 15% dochodu",
              "rozsądnie: od 15% do 20%",
              "na granicy: od 20% do 25%",
              "niezalecane: ponad 25%",
            ]
          : [
              "comfortable: purchase and fuel take up to 15% of income",
              "reasonable: 15% to 20%",
              "stretching it: 20% to 25%",
              "not recommended: over 25%",
            ],
      );
      for (const threshold of ["15%", "20%", "25%"]) await expect(income).toContainText(threshold);
      await expect(income).not.toContainText("10%");
    });

    test(`explains that the income scale counts purchase and fuel only (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}/methodology`);
      const sections = messages(locale).methodology.sections;
      const paragraphs =
        locale === "pl"
          ? [
              "Skala pokazuje miesięczny dochód netto (na rękę), przy którym zakup auta i paliwo zajmują określoną część budżetu. Cenę auta dzielimy równo na miesiące wybranego okresu posiadania, jak ratę bez odsetek, i dodajemy miesięczny koszt paliwa lub prądu.",
              "Ubezpieczenia, serwisu, części, opłat i utraty wartości w skali nie liczymy. Te kwoty są w koszcie posiadania na stronie auta, w rankingach i w porównaniu.",
              "Progi opieramy na polskich zaleceniach: wydatki na transport nie powinny przekraczać 15–20% dochodu netto. Do zakupu i paliwa dochodzą jeszcze inne koszty auta, dlatego powyżej 25% auto jest niezalecane. Kwoty zaokrąglamy do 100 zł, a widok roczny to 12 razy kwota miesięczna.",
            ]
          : [
              "The scale shows the net (take-home) monthly income at which purchase and fuel take a given share of the budget. We divide the price of the car evenly over the months of the chosen ownership period, like an instalment without interest, and add the monthly cost of fuel or electricity.",
              "Insurance, servicing, parts, fees and depreciation are not counted in the scale. They are part of the cost of ownership on the car page, in the rankings and in the comparison.",
              "The thresholds follow Polish guidance: transport should take no more than 15–20% of net income. The other costs of the car come on top of purchase and fuel, so above 25% the car is not recommended. Amounts are rounded to 100 zł, and the yearly view is 12 times the monthly amount.",
            ];
      const income = page.getByRole("main").getByRole("region", { name: sections.income.heading });
      const shown = income.locator("p");
      await expect.poll(async () => (await shown.allTextContents()).map(squash)).toEqual(paragraphs.map(squash));
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
