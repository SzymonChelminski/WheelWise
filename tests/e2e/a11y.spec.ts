import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import type { Car } from "@/lib/domain/types";
import { carBySlug, cars, cheapest, nameOf, ranking } from "./helpers/catalogue";
import { comparisonTable } from "./helpers/comparison";
import { expect, NOT_FOUND_LINE, PHOTO_FAILED_LINE, photoRoute, test } from "./helpers/fixtures";
import { LOCALES, msg, type Locale } from "./helpers/text";
import {
  compareBar,
  compareToggle,
  interactive,
  listTitle,
  openAssumptions,
  openFilters,
  rankingList,
  toggleCarName,
  visit,
} from "./helpers/ui";

const petrol = cheapest((car) => car.fuelType === "petrol");
const electric = cheapest((car) => car.fuelType === "ev");
const hybrid = cheapest((car) => car.fuelType === "hybrid");
const clio = carBySlug("renault-clio-diesel-manual-101km");
/** The cars with the longest names in the catalogue. */
const longest = [...cars].sort((a, b) => nameOf(b).length - nameOf(a).length).slice(0, 3);

interface Screen {
  name: string;
  open: (page: Page, locale: Locale) => Promise<void>;
  notFound?: boolean;
  /** The photo request is refused, so the browser logs the failed load. */
  photoFails?: boolean;
}

async function addToComparison(page: Page, locale: Locale, count: number) {
  const list = rankingList(page, listTitle(locale, "totalCost"));
  for (let index = 0; index < count; index++) {
    const row = list.getByRole("listitem").nth(index);
    const toggle = row.getByRole("button", { name: new RegExp(`^${msg(locale, "compareToggle.add")}: `) });
    await interactive(toggle);
    await toggle.click();
    await expect(row.getByRole("button", { name: new RegExp(`^${msg(locale, "compareToggle.added")}: `) })).toBeVisible();
  }
}

const screens: Screen[] = [
  {
    name: "home",
    open: async (page, locale) => {
      await visit(page, `/${locale}`);
      await expect(rankingList(page, msg(locale, "home.topCostTitle")).getByRole("listitem")).toHaveCount(5);
    },
  },
  {
    name: "rankings",
    open: async (page, locale) => {
      await visit(page, `/${locale}/rankings`);
      await expect(rankingList(page, listTitle(locale, "totalCost")).getByRole("listitem")).toHaveCount(10);
    },
  },
  {
    name: "rankings with the filters open and a filter on",
    open: async (page, locale) => {
      await visit(page, `/${locale}/rankings?fuel=hybrid`);
      await expect(rankingList(page, listTitle(locale, "totalCost")).getByRole("listitem")).toHaveCount(10);
      const { panel } = await openFilters(page);
      await expect(panel.getByRole("checkbox", { checked: true })).toHaveCount(1);
    },
  },
  {
    name: "rankings with the assumptions open",
    open: async (page, locale) => {
      await visit(page, `/${locale}/rankings`);
      const { panel } = await openAssumptions(page);
      await expect(panel.getByRole("textbox", { name: msg(locale, "assumptions.mileage") })).toBeVisible();
    },
  },
  {
    name: "rankings with two cars in the open comparison bar",
    open: async (page, locale) => {
      await visit(page, `/${locale}/rankings`);
      await addToComparison(page, locale, 2);
      const disclosure = compareBar(page).disclosure(2);
      await disclosure.click();
      await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    },
  },
  {
    name: "car page",
    open: async (page, locale) => {
      await visit(page, `/${locale}/cars/${petrol.slug}`);
      await expect(page.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })).toBeVisible();
    },
  },
  {
    name: "car page of an electric car",
    open: async (page, locale) => {
      await visit(page, `/${locale}/cars/${electric.slug}`);
      await expect(page.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })).toBeVisible();
    },
  },
  {
    name: "car page with the model photo (Renault Clio)",
    open: async (page, locale) => {
      await visit(page, `/${locale}/cars/${clio.slug}`);
      const image = page.getByRole("main").locator("figure[data-car-photo] img");
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0))
        .toBe(true);
    },
  },
  {
    name: "car page whose model photo cannot be loaded",
    photoFails: true,
    open: async (page, locale) => {
      await photoRoute(page, (route) => route.abort("failed"));
      await visit(page, `/${locale}/cars/${clio.slug}`);
      await expect(page.getByRole("main").locator("figure[data-car-photo]")).toHaveCount(0);
      await expect(page.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })).toBeVisible();
    },
  },
  {
    name: "comparison without cars",
    open: async (page, locale) => {
      await visit(page, `/${locale}/compare`);
      await expect(page.getByRole("heading", { name: msg(locale, "compare.emptyTitle") })).toBeVisible();
    },
  },
  {
    name: "comparison of two cars",
    open: async (page, locale) => {
      await visit(page, `/${locale}/compare?cars=${petrol.slug},${electric.slug}`);
      await expect(comparisonTable(page, locale, "month")).toBeVisible();
    },
  },
  {
    name: "comparison of three cars",
    open: async (page, locale) => {
      await visit(page, `/${locale}/compare?cars=${petrol.slug},${electric.slug},${hybrid.slug}`);
      await expect(comparisonTable(page, locale, "month")).toBeVisible();
    },
  },
  {
    name: "methodology",
    open: async (page, locale) => {
      await visit(page, `/${locale}/methodology`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg(locale, "methodology.title"));
    },
  },
  {
    name: "not-found page",
    notFound: true,
    open: async (page, locale) => {
      await page.goto(`/${locale}/no-such-page`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg(locale, "notFound.title"));
    },
  },
];

test.describe("accessibility checks", () => {
  for (const locale of LOCALES) {
    for (const screen of screens) {
      test(`${screen.name} has no WCAG 2.2 AA violations (${locale})`, async ({ page, watch }) => {
        if (screen.notFound) watch.allowConsole(NOT_FOUND_LINE);
        if (screen.photoFails) watch.allowConsole(PHOTO_FAILED_LINE);
        await screen.open(page, locale);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const violations = results.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          elements: violation.nodes.map((node) => node.target.join(" ")),
        }));
        expect(violations).toEqual([]);
      });
    }
  }
});

test.describe("narrow screens", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  const pages = (locale: Locale): { path: string; notFound?: boolean }[] => [
    { path: `/${locale}` },
    { path: `/${locale}/rankings` },
    { path: `/${locale}/rankings?metric=fuelConsumption&fuel=ev` },
    { path: `/${locale}/cars/${petrol.slug}` },
    { path: `/${locale}/cars/${electric.slug}` },
    ...longest.map((car) => ({ path: `/${locale}/cars/${car.slug}` })),
    { path: `/${locale}/compare` },
    { path: `/${locale}/compare?cars=${longest.map((car) => car.slug).join(",")}` },
    { path: `/${locale}/methodology` },
    { path: `/${locale}/no-such-page`, notFound: true },
  ];

  for (const locale of LOCALES) {
    test(`no page scrolls sideways at 320 px (${locale})`, async ({ page, watch }) => {
      watch.allowConsole(NOT_FOUND_LINE);
      const wide: string[] = [];
      for (const { path, notFound } of pages(locale)) {
        if (notFound) await page.goto(path);
        else await visit(page, path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (scrollWidth > clientWidth) wide.push(`${path}: ${scrollWidth} > ${clientWidth}`);
      }
      expect(wide).toEqual([]);
    });
  }

  test("no page scrolls sideways at 320 px with three cars in the open comparison bar", async ({ page }) => {
    await visit(page, "/pl/rankings");
    await addToComparison(page, "pl", 3);
    const disclosure = compareBar(page).disclosure(3);
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    const size = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth);
  });
});

/**
 * Controls in `scope` smaller than 24 x 24 CSS px. A control's label counts as part of its
 * target, and so does a link stretched over its row by a positioned `::after` box.
 */
async function smallTargets(scope: Locator): Promise<string[]> {
  const { checked, small } = await scope.evaluate((root) => {
    const controls = root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [role='button']");
    const small: string[] = [];
    let checked = 0;
    for (const control of controls) {
      if (control.closest("[inert], [aria-hidden='true']")) continue;
      if (control.getClientRects().length === 0 || getComputedStyle(control).visibility === "hidden") continue;
      let { left, top, right, bottom } = control.getBoundingClientRect();
      const extensions: Element[] = [...((control as HTMLInputElement).labels ?? [])];
      const after = getComputedStyle(control, "::after");
      if (after.content !== "none" && after.position === "absolute") {
        let holder = control.parentElement;
        while (holder && getComputedStyle(holder).position === "static") holder = holder.parentElement;
        if (holder) extensions.push(holder);
      }
      checked += 1;
      for (const label of extensions) {
        const box = label.getBoundingClientRect();
        left = Math.min(left, box.left);
        top = Math.min(top, box.top);
        right = Math.max(right, box.right);
        bottom = Math.max(bottom, box.bottom);
      }
      const width = right - left;
      const height = bottom - top;
      if (width < 24 || height < 24) {
        const name = control.getAttribute("aria-label") ?? control.textContent?.trim() ?? "";
        small.push(`${control.tagName.toLowerCase()} "${name.slice(0, 40)}" ${width.toFixed(1)}x${height.toFixed(1)}`);
      }
    }
    return { checked, small };
  });
  expect(checked, "controls measured").toBeGreaterThan(0);
  return small;
}

test.describe("target size", () => {
  test.skip(({ isMobile }) => !isMobile, "measured on the touch layout");

  test("header, ranking list, filters and comparison bar controls are at least 24 x 24 px", async ({ page }) => {
    await visit(page, "/pl/rankings");
    await addToComparison(page, "pl", 2);

    const found: Record<string, string[]> = {
      header: await smallTargets(page.getByRole("banner")),
      list: await smallTargets(rankingList(page, listTitle("pl", "totalCost"))),
      "comparison bar (closed)": await smallTargets(compareBar(page).region),
    };

    const disclosure = compareBar(page).disclosure(2);
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    found["comparison bar (open)"] = await smallTargets(compareBar(page).region);
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");

    const { panel } = await openFilters(page);
    found.filters = await smallTargets(panel);

    expect(found).toEqual({
      header: [],
      list: [],
      "comparison bar (closed)": [],
      "comparison bar (open)": [],
      filters: [],
    });
  });
});

test.describe("compare toggles", () => {
  test("toggles of cars with the same name on /pl/rankings have distinct accessible names", async ({ page }) => {
    const shown = ranking("totalCost")
      .slice(0, 10)
      .map((item) => item.car);
    const sharesName = (car: Car) => shown.filter((other) => nameOf(other) === nameOf(car)).length > 1;
    // The case only exists when at least two of the listed cars share a name.
    expect(shown.filter(sharesName).length, "listed cars that share a name").toBeGreaterThan(1);
    const expectedNames = shown.map((car) => toggleCarName("pl", car));
    expect(new Set(expectedNames).size, "distinct toggle names expected").toBe(shown.length);

    await visit(page, "/pl/rankings");
    const list = rankingList(page, listTitle("pl", "totalCost"));
    await expect(list.getByRole("listitem")).toHaveCount(shown.length);
    for (const [index, car] of shown.entries()) {
      const row = list.getByRole("listitem").nth(index);
      // The visible name stays the plain name; only the accessible name of the toggle adds the attributes.
      await expect(row.getByRole("heading", { level: 3 })).toHaveText(`${index + 1}. ${nameOf(car)}`);
      await expect(compareToggle(row, "pl", car)).toBeVisible();
      // Exactly one toggle in the whole list carries this name.
      await expect(compareToggle(list, "pl", car)).toHaveCount(1);
    }
    const names = await list
      .getByRole("button", { name: new RegExp(`^${msg("pl", "compareToggle.add")}: `) })
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""));
    expect(new Set(names).size, `toggle names: ${names.join(" | ")}`).toBe(shown.length);
  });
});
