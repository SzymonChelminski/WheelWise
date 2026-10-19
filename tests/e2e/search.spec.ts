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
    const car = matching("sander").find((item) => text.startsWith(nameOf(item)) && text.length > 0);
    expect(car, "the active suggestion is a matching car").toBeDefined();

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
