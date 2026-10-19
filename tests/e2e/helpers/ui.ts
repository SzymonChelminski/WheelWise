import type { Locator, Page } from "@playwright/test";
import type { RankedCar, RankingMetric } from "@/lib/costs";
import type { DriverAgeBand, Period } from "@/lib/domain/types";
import { COST_FIELD, nameOf, periodCosts } from "./catalogue";
import { expect } from "./fixtures";
import { decimal, escapeRegExp, msg, pln, squash, type Locale } from "./text";

/*
 * How a visitor reaches the controls of the site, on a wide and on a narrow
 * screen. Elements are found by role, accessible name and visible text.
 */

/** The language of the page, read from the first segment of its address. */
export function localeOf(page: Page): Locale {
  const segment = new URL(page.url()).pathname.split("/")[1];
  return segment === "en" ? "en" : "pl";
}

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 1280;
}

/** Filters sit in a sidebar from this width; below it they open in a sheet. */
export const SIDEBAR_FROM = 1024;
/** The metric selector is a row of links from this width; below it a select. */
export const METRIC_LINKS_FROM = 768;

/**
 * Waits until the browser has attached its event handlers to the element, so that a
 * click or a key press on it is not lost while the page is still starting.
 */
export async function interactive(locator: Locator): Promise<Locator> {
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactProps$")),
        ),
      { message: "the control responds to input" },
    )
    .toBe(true);
  return locator;
}

/** Opens a page and waits until its header controls respond. */
export async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const locale = localeOf(page);
  await interactive(
    page
      .getByRole("navigation", { name: msg(locale, "header.language") })
      .getByRole("link", { name: new RegExp(`^${locale.toUpperCase()}\\b`) }),
  );
}

/**
 * Holds back every navigation response of the app router (requests that carry the
 * `RSC` header) by `delayMs`, so that a visitor can click faster than the server
 * answers. Returns the number of responses held back so far.
 */
export async function slowNavigations(page: Page, delayMs: number): Promise<() => number> {
  let held = 0;
  await page.route("**/*", async (route) => {
    if (route.request().headers()["rsc"] !== undefined) {
      held += 1;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fallback();
  });
  return () => held;
}

/** Marks the current document; `expectSameDocument` fails after a full page load. */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
  });
}

export async function expectSameDocument(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
    "the page was not reloaded",
  ).toBe(true);
}

/** The query parameters of the address bar, as a sorted list of name=value. */
export function queryOf(page: Page): string[] {
  const params = new URL(page.url()).searchParams;
  return [...params.entries()].map(([name, value]) => `${name}=${value}`).sort();
}

export async function expectQuery(page: Page, expected: string[]): Promise<void> {
  await expect.poll(() => queryOf(page), { message: "query string of the address" }).toEqual(
    [...expected].sort(),
  );
}

// ---------------------------------------------------------------------------
// Rankings

export function rankingList(page: Page, title: string): Locator {
  return page.getByRole("main").getByRole("list", { name: title, exact: true });
}

/** The title of the rankings list for a metric and period. */
export function listTitle(locale: Locale, metric: RankingMetric, period: Period = "month"): string {
  const label = msg(locale, `metrics.${metric}.label`);
  if (metric === "price" || metric === "fuelConsumption") return label;
  return msg(locale, "rankings.listTitle", {
    metric: label,
    period: msg(locale, period === "year" ? "common.perYear" : "common.perMonth"),
  });
}

export interface RowText {
  /** Rank and name, as read by a screen reader: "1. Dacia SANDERO (67ch)". */
  name: string;
  /** The ranked value followed by its caption: "1 062 zł" + "miesięcznie". */
  value: string;
}

/** What a ranking row must show for a ranked car. */
export function expectedRow(
  item: RankedCar,
  metric: RankingMetric,
  period: Period,
  locale: Locale,
  electricOnly = false,
): RowText {
  let value: string;
  let caption: string;
  if (metric === "price") {
    value = pln(item.car.listPricePln, locale);
    caption = msg(locale, "common.indicative");
  } else if (metric === "fuelConsumption") {
    const unit = msg(locale, electricOnly ? "attr.consumptionElectric" : "attr.consumptionFuel");
    value = `${decimal(item.value, locale)} ${unit}`;
    caption = msg(locale, "rankings.consumptionCaption");
  } else {
    const field = COST_FIELD[metric];
    if (!field) throw new Error(`No cost field for ${metric}`);
    value = pln(periodCosts(item.costs, period)[field], locale);
    caption = msg(locale, period === "year" ? "common.perYear" : "common.perMonth");
  }
  return { name: `${item.rank}. ${nameOf(item.car)}`, value: squash(value) + caption };
}

/** True when `amount` occurs in `text` and is not the tail of a longer number. */
export function containsAmount(text: string, amount: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(amount, from);
    if (at < 0) return false;
    const before = text[at - 1] ?? "";
    const beforeThat = text[at - 2] ?? "";
    const glued = /\d/.test(before) || (/[ ,.]/.test(before) && /\d/.test(beforeThat));
    if (!glued) return true;
    from = at + 1;
  }
}

async function readRows(list: Locator): Promise<{ name: string; text: string }[]> {
  const items = list.getByRole("listitem");
  const [names, texts] = await Promise.all([
    items.getByRole("heading", { level: 3 }).allTextContents(),
    items.allTextContents(),
  ]);
  return texts.map((text, index) => ({ name: squash(names[index]), text: squash(text) }));
}

/** Waits until the list shows exactly these rows, in this order. */
export async function expectRows(list: Locator, expected: RowText[]): Promise<void> {
  await expect
    .poll(
      async () => {
        const rows = await readRows(list);
        return rows.map((row, index) => ({
          name: row.name,
          value:
            expected[index] && containsAmount(row.text, expected[index].value)
              ? expected[index].value
              : row.text,
        }));
      },
      { message: "rows of the ranking list" },
    )
    .toEqual(expected);
}

/** The filters: the sidebar on wide screens, the sheet on narrow ones. */
export async function openFilters(page: Page): Promise<{ panel: Locator; close: () => Promise<void> }> {
  const locale = localeOf(page);
  const title = msg(locale, "filters.title");
  if (viewportWidth(page) >= SIDEBAR_FROM) {
    return { panel: page.getByRole("complementary", { name: title }), close: async () => {} };
  }
  const trigger = page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(title)}`) });
  await interactive(trigger);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  return {
    panel: dialog,
    close: async () => {
      await dialog.getByRole("button", { name: msg(locale, "common.close"), exact: true }).click();
      await expect(dialog).toBeHidden();
    },
  };
}

/** A filter chip or make checkbox; its accessible name is the label and the number of cars. */
export function filterOption(panel: Locator, label: string): Locator {
  return panel.getByRole("checkbox", { name: new RegExp(`^${escapeRegExp(label)}( \\d+)?$`) });
}

/** Ticks or unticks a filter in the sidebar or the sheet (the sheet is closed again). */
export async function toggleFilter(page: Page, label: string): Promise<void> {
  const { panel, close } = await openFilters(page);
  const option = filterOption(panel, label);
  await interactive(option);
  await option.click();
  await close();
}

export async function chooseMetric(page: Page, metric: RankingMetric): Promise<void> {
  const locale = localeOf(page);
  const label = msg(locale, `metrics.${metric}.label`);
  const name = msg(locale, "rankings.metricLabel");
  if (viewportWidth(page) >= METRIC_LINKS_FROM) {
    const link = page
      .getByRole("navigation", { name })
      .getByRole("link", { name: label, exact: true });
    await interactive(link);
    await link.click();
  } else {
    const select = page.getByRole("main").getByRole("combobox", { name });
    await interactive(select);
    await select.selectOption({ label });
  }
}

// ---------------------------------------------------------------------------
// Assumptions and period

/** The assumptions form: the aside of the car page on wide screens, otherwise the sheet. */
export async function openAssumptions(
  page: Page,
): Promise<{ panel: Locator; close: () => Promise<void> }> {
  const locale = localeOf(page);
  const title = msg(locale, "assumptions.title");
  const aside = page.getByRole("complementary", { name: title });
  if (await aside.isVisible()) return { panel: aside, close: async () => {} };

  const trigger = page.getByRole("main").getByRole("button", { name: msg(locale, "assumptions.change") });
  await interactive(trigger);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  return {
    panel: dialog,
    close: async () => {
      await dialog.getByRole("button", { name: msg(locale, "assumptions.done"), exact: true }).click();
      await expect(dialog).toBeHidden();
    },
  };
}

export async function setMileage(panel: Locator, locale: Locale, km: number): Promise<void> {
  const field = panel.getByRole("textbox", { name: msg(locale, "assumptions.mileage") });
  await interactive(field);
  await field.fill(String(km));
  // Leaving the field applies the value at once.
  await field.press("Tab");
}

export async function setYears(panel: Locator, locale: Locale, years: number): Promise<void> {
  const select = panel.getByRole("combobox", { name: msg(locale, "assumptions.years") });
  await interactive(select);
  await select.selectOption({ label: msg(locale, "assumptions.yearsValue", { count: years }) });
}

export async function setAgeBand(panel: Locator, locale: Locale, band: DriverAgeBand): Promise<void> {
  const select = panel.getByRole("combobox", { name: msg(locale, "assumptions.ageBand") });
  await interactive(select);
  await select.selectOption({ label: msg(locale, `assumptions.ageBands.${band}`) });
}

export async function setCoverage(panel: Locator, locale: Locale, coverage: "oc" | "oc_ac"): Promise<void> {
  const key = coverage === "oc" ? "assumptions.coverageOc" : "assumptions.coverageOcAc";
  const radio = panel.getByRole("radio", { name: msg(locale, key), exact: true });
  await interactive(radio);
  await radio.check();
}

export async function setOwnPremium(panel: Locator, locale: Locale, premium: number): Promise<void> {
  const mode = panel.getByRole("radio", { name: msg(locale, "assumptions.insuranceCustom"), exact: true });
  await interactive(mode);
  await mode.check();
  const field = panel.getByRole("textbox", { name: msg(locale, "assumptions.premium") });
  await field.fill(String(premium));
  await field.press("Tab");
}

export async function choosePeriod(page: Page, period: Period): Promise<void> {
  const locale = localeOf(page);
  const radio = page
    .getByRole("main")
    .getByRole("radio", { name: msg(locale, period === "year" ? "period.year" : "period.month"), exact: true });
  await interactive(radio);
  await radio.check();
}

// ---------------------------------------------------------------------------
// Comparison bar

export function compareBar(page: Page) {
  const locale = localeOf(page);
  const region = page.getByRole("complementary", { name: msg(locale, "compareBar.region"), exact: true });
  return {
    region,
    /** The disclosure button "Wybrane: n z 3". */
    disclosure: (count: number) =>
      region.getByRole("button", { name: msg(locale, "compareBar.toggle", { count }), exact: true }),
    hint: region.getByRole("status"),
    /** The link to the comparison, offered from two cars. */
    compareLink: (count: number) =>
      region.getByRole("link", { name: msg(locale, "compareBar.compare", { count }), exact: true }),
    removeButton: (name: string) =>
      region.getByRole("button", { name: `${msg(locale, "compareBar.remove")}: ${name}`, exact: true }),
  };
}

/** The "Compare" toggle of a car in a list or on its page. */
export function compareToggle(scope: Page | Locator, locale: Locale, name: string, added = false): Locator {
  const label = msg(locale, added ? "compareToggle.added" : "compareToggle.add");
  return scope.getByRole("button", { name: `${label}: ${name}`, exact: true });
}

// ---------------------------------------------------------------------------
// Tables

export interface TableRow {
  label: string;
  cells: string[];
}

/**
 * The body rows of a table as label and cells. A row label printed on its own
 * line above the values (narrow comparison table) is joined with the values.
 */
export async function readTable(table: Locator): Promise<TableRow[]> {
  const rows = await table.evaluate((element) => {
    const squashText = (text: string | null) => (text ?? "").replace(/[\s  ]+/g, " ").trim();
    const result: { label: string; cells: string[] }[] = [];
    let pending: string | null = null;
    const body = [...(element as HTMLTableElement).rows].filter((row) => row.parentElement?.tagName !== "THEAD");
    for (const row of body) {
      const headers = [...row.cells].filter((cell) => cell.tagName === "TH");
      const data = [...row.cells].filter((cell) => cell.tagName === "TD");
      if (headers.length > 0 && data.length === 0) {
        pending = squashText(headers[0].textContent);
        continue;
      }
      const label = headers.length > 0 ? squashText(headers[0].textContent) : (pending ?? "");
      pending = null;
      result.push({ label, cells: data.map((cell) => squashText(cell.textContent)) });
    }
    return result;
  });
  return rows;
}

/** Text of an estimated amount as the page prints it: the sign, the spoken word, the amount. */
export function estimateText(locale: Locale, amount: string): string {
  return squash(`≈${msg(locale, "common.estimateSr")} ${amount}`);
}
