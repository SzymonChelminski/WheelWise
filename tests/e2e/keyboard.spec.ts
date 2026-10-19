import type { Locator, Page } from "@playwright/test";
import { ranking, nameOf } from "./helpers/catalogue";
import { comparisonTable } from "./helpers/comparison";
import { expect, test } from "./helpers/fixtures";
import { msg } from "./helpers/text";
import { compareBar, compareToggle, expectQuery, interactive, listTitle, rankingList, visit } from "./helpers/ui";

/*
 * Keyboard use on a wide screen: every step is taken with Tab, Enter and Space,
 * and at every stop the focused element shows its focus ring and is on screen.
 */
test.skip(({ isMobile }) => isMobile, "keyboard flows are checked on the desktop layout");

interface FocusStop {
  tag: string;
  text: string;
  /** False when Tab has moved focus out of the page, to the browser's own controls. */
  inPage: boolean;
  onBody: boolean;
  ring: boolean;
  onScreen: boolean;
  region: "banner" | "main" | "contentinfo" | "other";
}

async function focusStop(page: Page): Promise<FocusStop> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    const inPage = document.hasFocus();
    if (!active || active === document.body) {
      return { tag: "body", text: "", inPage, onBody: true, ring: false, onScreen: false, region: "other" as const };
    }
    const region = active.closest("header")
      ? ("banner" as const)
      : active.closest("main")
        ? ("main" as const)
        : active.closest("footer")
          ? ("contentinfo" as const)
          : ("other" as const);
    let ring = false;
    for (let element: Element | null = active, depth = 0; element && depth < 5; element = element.parentElement, depth++) {
      const style = getComputedStyle(element);
      if (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) {
        ring = true;
        break;
      }
    }
    const box = active.getBoundingClientRect();
    const onScreen = box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
    return {
      tag: active.tagName.toLowerCase(),
      text: (active.getAttribute("aria-label") ?? active.textContent ?? "").trim().slice(0, 60),
      inPage,
      onBody: false,
      ring,
      onScreen,
      region,
    };
  });
}

/**
 * Presses Tab until `target` has focus; every stop on the way inside the page must show a
 * visible focus. A stop outside the page (Tab past the last control goes to the browser's
 * own controls) is not a stop of the page.
 */
async function tabTo(page: Page, target: Locator, maxStops = 200): Promise<void> {
  const problems: FocusStop[] = [];
  for (let stop = 0; stop < maxStops; stop++) {
    await page.keyboard.press("Tab");
    const state = await focusStop(page);
    if (state.inPage && (state.onBody || !state.ring || !state.onScreen)) problems.push(state);
    if (await target.evaluate((element) => element === document.activeElement)) {
      expect(problems, "focus stops without a visible focus").toEqual([]);
      return;
    }
  }
  throw new Error(`Focus did not reach the target within ${maxStops} presses of Tab`);
}

test.describe("keyboard", () => {
  test("a visitor finds, filters, picks and compares cars without a pointer", async ({ page }) => {
    await visit(page, "/pl");

    // Skip link first; it moves focus to the main content.
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: msg("pl", "common.skip") });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    expect((await focusStop(page)).ring).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();

    // Search: type and press Enter to open the rankings for the text.
    const search = page.getByRole("main").getByRole("combobox", { name: msg("pl", "search.label") });
    await interactive(search);
    await tabTo(page, search);
    await page.keyboard.type("sandero");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/pl/rankings?q=sandero");

    // Another metric.
    const priceLink = page
      .getByRole("navigation", { name: msg("pl", "rankings.metricLabel") })
      .getByRole("link", { name: msg("pl", "metrics.price.label"), exact: true });
    await interactive(priceLink);
    await tabTo(page, priceLink);
    await page.keyboard.press("Enter");
    await expectQuery(page, ["metric=price", "q=sandero"]);
    const title = listTitle("pl", "price");
    await expect(page.getByRole("main").getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();

    // A filter, ticked with Space.
    const petrolChip = page
      .getByRole("complementary", { name: msg("pl", "filters.title") })
      .getByRole("checkbox", { name: new RegExp(`^${msg("pl", "attr.fuel.petrol")}( \\d+)?$`) });
    await tabTo(page, petrolChip);
    await page.keyboard.press("Space");
    await expectQuery(page, ["fuel=petrol", "metric=price", "q=sandero"]);

    // Two cars into the comparison.
    const [first, second] = ranking("price", { fuelTypes: ["petrol"], query: "sandero" }).map((item) => item.car);
    const list = rankingList(page, title);
    await expect(list.getByRole("listitem")).toHaveCount(ranking("price", { fuelTypes: ["petrol"], query: "sandero" }).length);
    for (const [index, car] of [first, second].entries()) {
      // Two cars can share a name, so each toggle is taken from its own row.
      const row = list.getByRole("listitem").nth(index);
      await expect(row.getByRole("heading", { level: 3 })).toHaveText(`${index + 1}. ${nameOf(car)}`);
      const toggle = compareToggle(row, "pl", nameOf(car));
      await interactive(toggle);
      await tabTo(page, toggle);
      await page.keyboard.press("Enter");
      await expect(compareToggle(row, "pl", nameOf(car), true)).toBeFocused();
    }

    // Open the comparison from the bar.
    const compare = compareBar(page).compareLink(2);
    await tabTo(page, compare);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/pl/compare?cars=${first.slug},${second.slug}`);
    await expect(comparisonTable(page, "pl", "month")).toBeVisible();
  });

  test("after a page change made from the keyboard, the next Tab starts at the top of the new page", async ({
    page,
  }) => {
    const firstStopAfter = async (where: string) => {
      await page.keyboard.press("Tab");
      const stop = await focusStop(page);
      const atTop =
        stop.inPage &&
        (stop.region === "banner" || stop.region === "main" || stop.text === msg("pl", "common.skip"));
      expect.soft(atTop, `first Tab after ${where} landed on ${stop.tag} "${stop.text}" in ${stop.region}`).toBe(
        true,
      );
    };

    // Search on the home page opens the rankings.
    await visit(page, "/pl");
    const search = page.getByRole("main").getByRole("combobox", { name: msg("pl", "search.label") });
    await interactive(search);
    await tabTo(page, search);
    await page.keyboard.type("sandero");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/pl/rankings?q=sandero");
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(msg("pl", "rankings.title"));
    await firstStopAfter("the search opened the rankings");

    // A ranking row opens a car page.
    await visit(page, "/pl/rankings");
    const car = ranking("totalCost")[0].car;
    const row = rankingList(page, listTitle("pl", "totalCost")).getByRole("link", { name: `1. ${nameOf(car)}` });
    await interactive(row);
    await tabTo(page, row);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/pl/cars/${car.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nameOf(car));
    await firstStopAfter("a ranking row opened a car page");
  });

  test("after a language switch, removing filter chips keeps focus on the page", async ({ page }) => {
    await visit(page, "/pl/rankings?fuel=lpg&make=Dacia");
    const english = page
      .getByRole("navigation", { name: msg("pl", "header.language") })
      .getByRole("link", { name: /^EN\b/ });
    await tabTo(page, english);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/en/rankings?fuel=lpg&make=Dacia");

    const main = page.getByRole("main");
    const removeLpg = main.getByRole("button", { name: `${msg("en", "filters.remove")}: LPG`, exact: true });
    const removeDacia = main.getByRole("button", { name: `${msg("en", "filters.remove")}: Dacia`, exact: true });
    await interactive(removeLpg);
    await tabTo(page, removeLpg);
    await page.keyboard.press("Enter");
    await expectQuery(page, ["make=Dacia"]);
    await expect(removeDacia).toBeFocused();

    await page.keyboard.press("Enter");
    await expectQuery(page, []);
    await expect(
      main.getByRole("heading", { level: 2, name: listTitle("en", "totalCost"), exact: true }),
    ).toBeFocused();
    expect((await focusStop(page)).onBody).toBe(false);
  });
});
