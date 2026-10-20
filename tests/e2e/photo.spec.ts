import type { Locator, Page, Route } from "@playwright/test";
import modelImages from "../../data/model-images.json";
import type { CarPhotoData } from "@/components/ui/CarPhoto";
import { carBySlug, nameOf } from "./helpers/catalogue";
import { answerPhoto, expect, PHOTO_FAILED_LINE, PHOTO_HOST, photoRoute, test } from "./helpers/fixtures";
import { exactly, LOCALES, msg, pln, type Locale } from "./helpers/text";
import { compareToggle, SIDEBAR_FROM, visit } from "./helpers/ui";

/*
 * The model photo on the car page. Thumbnails never leave the test machine: the shared fixture
 * answers them with a stand-in image, and single tests hold them back or refuse them.
 */

const clio = carBySlug("renault-clio-diesel-manual-101km");
const clioPhoto = (modelImages as Record<string, CarPhotoData | null>)["renault/clio"] as CarPhotoData;

/** Texts of the photo as the design gives them. */
const TEXT = {
  pl: {
    alt: (name: string) => `${name}: zdjęcie poglądowe modelu`,
    marker: "Zdjęcie poglądowe",
    credit: (author: string, license: string) => `Zdjęcie: ${author}, licencja ${license}, źródło: Wikimedia Commons`,
  },
  en: {
    alt: (name: string) => `${name}: illustrative photo of the model`,
    marker: "Illustrative photo",
    credit: (author: string, license: string) => `Photo: ${author}, licence ${license}, source: Wikimedia Commons`,
  },
} as const;

const SIZES = "(min-width: 64rem) 22rem, (min-width: 30rem) 28rem, calc(100vw - 2rem)";

function photoFigure(page: Page): Locator {
  return page.getByRole("main").locator("figure[data-car-photo]");
}

/** Top edge and size of an element, in page coordinates (independent of scrolling). */
async function box(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height };
  });
}

/** The parts of the page whose position the layout-jump rule speaks about. */
function parts(page: Page, locale: Locale) {
  const main = page.getByRole("main");
  return {
    heading: main.getByRole("heading", { level: 1 }),
    price: main.getByText(exactly(pln(clio.listPricePln, locale))),
    attributes: main.getByRole("region", { name: msg(locale, "car.attributes"), exact: true }),
    aside: main.getByRole("complementary", { name: msg(locale, "assumptions.title"), exact: true }),
  };
}

async function positions(page: Page, locale: Locale) {
  const { heading, price, attributes } = parts(page, locale);
  return { heading: await box(heading), price: await box(price), attributes: await box(attributes) };
}

/** Holds thumbnail requests until the test lets them go with `release`. */
async function holdPhotos(page: Page) {
  const held: Route[] = [];
  await photoRoute(page, async (route) => {
    held.push(route);
  });
  return {
    count: () => held.length,
    release: async (outcome: "load" | "fail") => {
      for (const route of held.splice(0)) {
        if (outcome === "load") await answerPhoto(route);
        else await route.abort("failed");
      }
    },
  };
}

/** The no-photo state of the design: nothing of the photo is on the page. */
async function expectNoPhoto(page: Page, locale: Locale) {
  const main = page.getByRole("main");
  await expect(photoFigure(page)).toHaveCount(0);
  await expect(main.locator("img")).toHaveCount(0);
  await expect(main.getByText(TEXT[locale].marker, { exact: true })).toHaveCount(0);
  await expect(main.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveCount(0);
  // The rest of the page is complete.
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(nameOf(clio));
  await expect(parts(page, locale).attributes).toBeVisible();
  await expect(main.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true })).toBeVisible();
}

test.describe("model photo on the car page", () => {
  for (const locale of LOCALES) {
    test(`the Renault Clio page shows its photo with alt text, size, credit and the illustrative tag (${locale})`, async ({
      page,
      watch,
    }) => {
      await visit(page, `/${locale}/cars/${clio.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Renault Clio");
      const figure = photoFigure(page);
      await expect(figure).toHaveCount(1);

      const image = figure.getByRole("img", { name: TEXT[locale].alt("Renault Clio"), exact: true });
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute("width", String(clioPhoto.width));
      await expect(image).toHaveAttribute("height", String(clioPhoto.height));
      await expect(image).toHaveAttribute("loading", "eager");
      await expect(image).toHaveAttribute("fetchpriority", "high");
      await expect(image).toHaveAttribute("decoding", "async");
      await expect(image).toHaveAttribute("sizes", SIZES);
      const byWidth = new Map(clioPhoto.sources.map((source) => [source.width, source.url]));
      await expect(image).toHaveAttribute("src", byWidth.get(960) ?? "");
      await expect(image).toHaveAttribute(
        "srcset",
        [500, 960, 1280].map((width) => `${byWidth.get(width as 500)} ${width}w`).join(", "),
      );
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), {
          message: "the photo has loaded",
        })
        .toBe(true);

      // The tag on the photo is hidden from assistive technology: the alt text says the same.
      const marker = figure.getByText(TEXT[locale].marker, { exact: true });
      await expect(marker).toBeVisible();
      await expect(figure.locator("[aria-hidden='true']").filter({ hasText: TEXT[locale].marker })).toHaveCount(1);

      const caption = figure.locator("figcaption");
      await expect(caption).toHaveText(exactly(TEXT[locale].credit(clioPhoto.author, clioPhoto.license)));
      const licence = caption.getByRole("link", { name: clioPhoto.license, exact: true });
      await expect(licence).toHaveAttribute("href", clioPhoto.licenseUrl ?? "");
      await expect(licence).toHaveAttribute("target", "_blank");
      await expect(licence).toHaveAttribute("rel", /\bnoreferrer\b/);
      const source = caption.getByRole("link", { name: "Wikimedia Commons", exact: true });
      await expect(source).toHaveAttribute("href", clioPhoto.sourceUrl);
      await expect(source).toHaveAttribute("target", "_blank");
      await expect(source).toHaveAttribute("rel", /\bnoreferrer\b/);
      expect(new URL(clioPhoto.sourceUrl).host).toBe("commons.wikimedia.org");

      // The browser asked only for thumbnails of this photo; nothing went to Wikipedia or the Commons API.
      const requested = watch.photoRequests();
      expect(requested.length, "thumbnail requests").toBeGreaterThan(0);
      for (const url of requested) {
        expect(new URL(url).host).toBe(PHOTO_HOST);
        expect([...byWidth.values()], url).toContain(url);
      }
      expect(watch.foreignRequests().filter((url) => /wikipedia\.org|commons\.wikimedia\.org/.test(url))).toEqual([]);
    });
  }

  test("the photo sits between the compare toggle and the attributes, in the right column from 1024 px", async ({
    page,
  }) => {
    await visit(page, `/pl/cars/${clio.slug}`);
    const figure = photoFigure(page);
    await expect(figure.getByRole("img")).toBeVisible();
    const { heading, attributes } = parts(page, "pl");
    const toggle = compareToggle(page.getByRole("main"), "pl", clio);
    await expect(toggle).toBeVisible();

    // DOM order: head (with the compare toggle), photo, body (attributes).
    const handles = [await toggle.elementHandle(), await figure.elementHandle(), await attributes.elementHandle()];
    const order = await page.evaluate(([button, photoElement, section]) => {
      const follows = (a: Node | null, b: Node | null) =>
        !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      return { afterToggle: follows(button, photoElement), beforeAttributes: follows(photoElement, section) };
    }, handles);
    expect(order).toEqual({ afterToggle: true, beforeAttributes: true });

    const photo = await box(figure);
    const title = await box(heading);
    const width = page.viewportSize()?.width ?? 1280;
    if (width >= SIDEBAR_FROM) {
      // Top of the right column, level with the top of the h1, 22rem wide.
      expect(Math.abs(photo.top - title.top), "photo top against h1 top").toBeLessThanOrEqual(1);
      expect(Math.abs(photo.width - 352), "photo width").toBeLessThanOrEqual(1);
      expect(photo.left).toBeGreaterThan(title.left + title.width);
    } else {
      // In the flow: 2rem below the compare toggle, aligned with the h1, at most 28rem wide;
      // the attributes start 2rem below the caption.
      const button = await box(toggle);
      expect(Math.abs(photo.top - (button.top + button.height + 32)), "gap above the photo").toBeLessThanOrEqual(1);
      expect(Math.abs(photo.left - title.left), "left edge").toBeLessThanOrEqual(1);
      expect(photo.width).toBeLessThanOrEqual(448 + 1);
      const details = await box(attributes);
      expect(Math.abs(details.top - (photo.top + photo.height + 32)), "gap below the photo").toBeLessThanOrEqual(1);
    }
  });

  for (const outcome of ["load", "fail"] as const) {
    test(`while the photo loads nothing moves; when it ${outcome === "load" ? "arrives nothing moves" : "fails the slot goes and only the content under it may move"}`, async ({
      page,
      watch,
    }) => {
      if (outcome === "fail") watch.allowConsole(PHOTO_FAILED_LINE);
      const photos = await holdPhotos(page);
      await visit(page, `/pl/cars/${clio.slug}`, { waitUntil: "domcontentloaded" });
      const figure = photoFigure(page);
      await expect(figure).toHaveCount(1);
      await expect.poll(() => photos.count(), { message: "thumbnail requests held back" }).toBeGreaterThan(0);

      const loading = await positions(page, "pl");
      const slot = await box(figure);
      await photos.release(outcome);

      if (outcome === "load") {
        await expect
          .poll(() => figure.locator("img").evaluate((element: HTMLImageElement) => element.naturalWidth > 0))
          .toBe(true);
        const loaded = await positions(page, "pl");
        for (const key of ["heading", "price", "attributes"] as const) {
          expect(Math.abs(loaded[key].top - loading[key].top), `${key} moved when the photo arrived`).toBeLessThanOrEqual(1);
        }
        expect(Math.abs((await box(figure)).height - slot.height), "frame height").toBeLessThanOrEqual(1);
        return;
      }

      await expectNoPhoto(page, "pl");
      const after = await positions(page, "pl");
      expect(Math.abs(after.heading.top - loading.heading.top), "h1 moved").toBeLessThanOrEqual(1);
      expect(Math.abs(after.price.top - loading.price.top), "price moved").toBeLessThanOrEqual(1);
      const moved = loading.attributes.top - after.attributes.top;
      if ((page.viewportSize()?.width ?? 1280) >= SIDEBAR_FROM) {
        // The content column does not move; only the aside takes the freed top of the right column.
        expect(Math.abs(moved), "attributes moved").toBeLessThanOrEqual(1);
      } else {
        // Everything under the slot moves up by the slot and its 2rem margin, and by no more.
        expect(Math.abs(moved - (slot.height + 32)), `attributes moved ${moved} px for a ${slot.height} px slot`).toBeLessThanOrEqual(1);
      }
    });
  }

  for (const locale of LOCALES) {
    test(`a photo that cannot be loaded leaves the designed no-photo state (${locale})`, async ({ page, watch }) => {
      watch.allowConsole(PHOTO_FAILED_LINE);
      await photoRoute(page, (route) => route.abort("failed"));
      await visit(page, `/${locale}/cars/${clio.slug}`);
      await expectNoPhoto(page, locale);
      expect(watch.photoRequests().length, "thumbnail requests").toBeGreaterThan(0);

      if ((page.viewportSize()?.width ?? 1280) >= SIDEBAR_FROM) {
        // Without a photo the assumptions aside starts at the top of the right column, level with the h1.
        const { heading, aside } = parts(page, locale);
        const title = await box(heading);
        const panel = await box(aside);
        expect(Math.abs(panel.top - title.top), "aside top against h1 top").toBeLessThanOrEqual(1);
      }
    });
  }
});
