/*
 * Model photos for the design preview: real Wikimedia Commons files, the lead
 * images of the English Wikipedia articles about these models (checked
 * 2026-10-20 through the Commons API: author, licence, original size). The
 * thumbnails are the standard widths Wikimedia serves to direct requests
 * (500, 960, 1280 px). In the real pages this file is replaced by
 * data/model-images.json and getModelImage(car).
 */
import type { CarPhotoData } from "@/components/ui/CarPhoto";
import type { Car } from "./types";

const THUMB = "https://upload.wikimedia.org/wikipedia/commons/thumb";

/** Thumbnails of one Commons file at the three standard widths. `path` is "a/ab/File_name.jpg", URL-encoded. */
function thumbs(path: string): CarPhotoData["sources"] {
  const file = path.split("/").pop()!;
  return ([500, 960, 1280] as const).map((width) => ({
    width,
    url: `${THUMB}/${path}/${width}px-${file}`,
  }));
}

const CC_BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" };

/** Dacia Sandero III (2023): a newer generation than the car in the mock catalogue, as the real data will often show. */
export const mockPhotoSandero: CarPhotoData = {
  sources: thumbs("3/3e/2023_Dacia_Sandero_III_DSC_6012.jpg"),
  width: 3936,
  height: 2631,
  author: "Alexander-93",
  ...CC_BY_SA_4,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:2023_Dacia_Sandero_III_DSC_6012.jpg",
};

export const mockPhotoTesla: CarPhotoData = {
  sources: thumbs("a/ab/Tesla_Model_3_%282023%29_Autofr%C3%BChling_Ulm_IMG_9282.jpg"),
  width: 5156,
  height: 3432,
  author: "Alexander-93",
  ...CC_BY_SA_4,
  sourceUrl:
    "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023)_Autofr%C3%BChling_Ulm_IMG_9282.jpg",
};

/** Jeep Compass (2019, US version): the photo shows the model, not the version on the page. */
export const mockPhotoJeep: CarPhotoData = {
  sources: thumbs("e/e0/2019_Jeep_Compass_Limited_2.4L%2C_front_7.6.19.jpg"),
  width: 4858,
  height: 2771,
  author: "Kevauto",
  ...CC_BY_SA_4,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:2019_Jeep_Compass_Limited_2.4L,_front_7.6.19.jpg",
};

/** Kia Ceed (2018): a wide 2.1 : 1 original, tightly cropped around the car; the frame keeps its proportions (components preview). */
export const mockPhotoCeed: CarPhotoData = {
  sources: thumbs("c/c6/2018_Kia_Ceed_First_Edition_1.4_Front.jpg"),
  width: 4267,
  height: 2029,
  author: "Vauxford",
  ...CC_BY_SA_4,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:2018_Kia_Ceed_First_Edition_1.4_Front.jpg",
};

/**
 * Load failure: the Sandero entry pointing at a Commons file that does not
 * exist (as after a file is deleted on Commons), so every thumbnail answers
 * 404 and the component shows the no-photo state (preview "car-photo-error").
 */
export const mockPhotoBroken: CarPhotoData = {
  ...mockPhotoSandero,
  sources: thumbs("e/e9/WheelWise_preview_missing_file.jpg"),
};

/** Photo per model, keyed like data/model-images.json: toSlug(make) + "/" + toSlug(model). */
export const mockModelImages: Record<string, CarPhotoData | null> = {
  "dacia/sandero": mockPhotoSandero,
  "tesla/model-3": mockPhotoTesla,
  "jeep/compass": mockPhotoJeep,
  "kia/ceed": mockPhotoCeed,
};

function slugPart(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The photo of a car's model, or null when the model has none. */
export function mockPhotoFor(car: Car): CarPhotoData | null {
  return mockModelImages[`${slugPart(car.make)}/${slugPart(car.model)}`] ?? null;
}
