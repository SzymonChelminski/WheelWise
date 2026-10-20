import { cars, nameOf, ranking } from "./helpers/catalogue";
import { expect, test } from "./helpers/fixtures";
import { msg, squash, type Locale } from "./helpers/text";
import { expectedRow, expectQuery, expectRows, interactive, listTitle, rankingList, visit } from "./helpers/ui";

/** Cars whose make, model and description contain every typed word, ignoring case and accents. */
function matching(query: string) {
  const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return cars.filter((car) => {
    const haystack = fold(`${car.make} ${car.model} ${car.variant}`);
    return words.every((word) => haystack.includes(word));
  });
}

async function searchField(page: import("@playwright/test").Page, locale: Locale) {
  const field = page.getByRole("main").getByRole("combobox", { name: msg(locale, "search.label") });
  await interactive(field);
  return field;
}

test.describe("search", () => {
  test("typing part of a model name lists the matching cars", async ({ page }) => {
    await visit(page, "/pl");
    const field = await searchField(page, "pl");
    await field.fill("sander");

    const expected = matching("sander");
    expect(expected.length).toBeGreaterThan(1);
    expect(expected.length).toBeLessThanOrEqual(8);
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(expected.length);
    const texts = (await options.allTextContents()).map(squash);
    for (const car of expected) {
      expect(texts.some((text) => text.startsWith(nameOf(car))), nameOf(car)).toBe(true);
    }
    await expect(page.getByRole("status").filter({ hasText: msg("pl", "search.status", { count: expected.length }) })).toBeAttached();

    // Escape closes the list; pressed again it clears the field.
    await field.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await field.press("Escape");
    await expect(field).toHaveValue("");
  });

  for (const [locale, body] of [
    ["pl", "hatchback lub sedan"],
    ["en", "hatchback or saloon"],
  ] as const) {
    test(`"clio" suggests cars named Renault Clio, described as ${body} (${locale})`, async ({ page }) => {
      await visit(page, `/${locale}`);
      const field = await searchField(page, locale);
      await field.fill("clio");

      const expected = matching("clio");
      expect(expected.length).toBeGreaterThan(1);
      expect(expected.every((car) => nameOf(car) === "Renault Clio")).toBe(true);
      const options = page.getByRole("listbox").getByRole("option");
      await expect(options).toHaveCount(expected.length);
      const texts = (await options.allTextContents()).map(squash);
      for (const text of texts) {
        expect(text.startsWith("Renault Clio"), text).toBe(true);
        expect(text, text).not.toMatch(/\(\s*\d+\s*(ch|cv|kw)/i);
        expect(text, text).not.toMatch(/CLIO/);
      }
      const hatchbacks = expected.filter((car) => car.bodyType === "sedan_hatchback").length;
      expect(hatchbacks).toBeGreaterThan(0);
      expect(texts.filter((text) => text.includes(body))).toHaveLength(hatchbacks);
      expect(texts.filter((text) => /sedan \/ hatchback|sedan\/hatchback/i.test(text))).toEqual([]);
    });
  }

  test("choosing a suggestion with the keyboard opens that car", async ({ page }) => {
    await visit(page, "/pl");
    const field = await searchField(page, "pl");
    await field.fill("sander");
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(matching("sander").length);

    await field.press("ArrowDown");
    await field.press("ArrowDown");
    const second = options.nth(1);
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(field).toHaveAttribute("aria-activedescendant", (await second.getAttribute("id")) ?? "");
    const text = squash(await second.textContent());
    // Several cars can share a name; the attributes printed with it tell them apart.
    const candidates = matching("sander").filter(
      (item) =>
        text.startsWith(nameOf(item)) &&
        text.includes(msg("pl", `attr.fuel.${item.fuelType}`)) &&
        text.includes(msg("pl", `attr.transmission.${item.transmission}`)) &&
        text.includes(`${Math.round(item.powerKw * 1.35962)} KM`),
    );
    expect(candidates, `the active suggestion "${text}" is one matching car`).toHaveLength(1);
    const car = candidates[0];

    await field.press("Enter");
    await expect(page).toHaveURL(`/pl/cars/${car!.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nameOf(car!));
  });

  test("Enter without a suggestion opens the rankings filtered by the text", async ({ page }) => {
    await visit(page, "/en");
    const field = await searchField(page, "en");
    await field.fill("clio");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/en\/rankings\?/);
    await expectQuery(page, ["q=clio"]);
    const title = listTitle("en", "totalCost");
    await expectRows(
      rankingList(page, title),
      ranking("totalCost", { query: "clio" })
        .slice(0, 10)
        .map((item) => expectedRow(item, "totalCost", "month", "en")),
    );
  });
});
