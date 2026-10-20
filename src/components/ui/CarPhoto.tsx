"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";
import { IndicativeTag } from "./Markers";
import { linkClass } from "./styles";

/*
 * Illustrative photo of a car model on the car page: one Wikimedia Commons
 * file per make + model, with its author, licence and file page printed under
 * it. The photo shows the model, not necessarily the version or generation on
 * the page, so it carries the "zdjęcie poglądowe" tag (the same tag that marks
 * the list price as indicative).
 * No photo, or a photo that fails to load: the component renders nothing.
 * Plain <img> on purpose: remote image optimisation would use the hosting
 * plan's image quota.
 */

/** Model photo data, resolved ahead of time from Wikimedia Commons. */
export interface CarPhotoData {
  /** Thumbnails at the standard Wikimedia widths only. */
  sources: { width: 500 | 960 | 1280; url: string }[];
  /** Original size in pixels (gives the aspect ratio). */
  width: number;
  height: number;
  /** Plain text, at most 120 characters. */
  author: string;
  /** Short name: "CC BY-SA 4.0", "CC0", "Public domain". */
  license: string;
  licenseUrl: string | null;
  /** Commons file page. */
  sourceUrl: string;
}

export interface CarPhotoLabels {
  /** Alt text template with {name}: "{name}: zdjęcie poglądowe modelu". */
  alt: string;
  /** Tag on the photo: "Zdjęcie poglądowe". */
  marker: string;
  /** Caption template with {author}, {license}, {source}: "Zdjęcie: {author}, licencja {license}, źródło: {source}". */
  credit: string;
  /** Caption template for public-domain files, no word "licence": "Zdjęcie: {author}, {license}, źródło: {source}". */
  creditPublicDomain: string;
  /** Printed instead of the short name "Public domain": "domena publiczna". */
  publicDomain: string;
  /** Text of the link to the file page: "Wikimedia Commons". */
  source: string;
  /** Printed when the author field is empty: "autor nieznany". */
  unknownAuthor: string;
}

/**
 * Frame proportions: a photo between 4:3 and 2.4:1 keeps its own, so the whole car stays in view
 * (Commons car photos are often cropped tight around the body, up to about 2.1:1). A taller photo
 * is cropped to 4:3 around its centre, a wider one to 2.4:1.
 */
const MIN_RATIO = 4 / 3;
const MAX_RATIO = 2.4;

/** Rendered width of the photo (DESIGN.md 6.3): 22rem column from 1024 px, else the 28rem text column or the page width. */
const SIZES = "(min-width: 64rem) 22rem, (min-width: 30rem) 28rem, calc(100vw - 2rem)";

function isPublicDomain(license: string): boolean {
  return /^(public domain|pd)\b/i.test(license.trim());
}

/** Fills {key} placeholders of a template with nodes; unknown text stays as it is. */
function fill(template: string, parts: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const key = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={index}>{key && key in parts ? parts[key] : piece}</Fragment>;
  });
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${linkClass} inline-flex min-h-6 items-center gap-1`}
    >
      {children}
      <Icon name="external" size={16} />
    </a>
  );
}

export function CarPhoto({
  photo,
  carName,
  labels,
  className,
}: {
  photo: CarPhotoData | null;
  /** Make + variant, as in the h1. */
  carName: string;
  labels: CarPhotoLabels;
  /** Placement only (margins, grid position, max width). */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // An image that failed before hydration fires no React onError: check it once after mount.
  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  if (!photo || photo.sources.length === 0 || failed) return null;

  const sources = [...photo.sources].sort((a, b) => a.width - b.width);
  const fallback = sources.find((source) => source.width === 960) ?? sources[sources.length - 1];
  const ratio = Math.min(Math.max(photo.width / photo.height, MIN_RATIO), MAX_RATIO);
  const publicDomain = isPublicDomain(photo.license);
  const licenseText = publicDomain ? labels.publicDomain : photo.license;
  const author = photo.author.trim() || labels.unknownAuthor;

  return (
    <figure data-car-photo="" className={cn("min-w-0", className)}>
      {/* Before the image arrives the frame is a sunken block of the final size: nothing moves when it loads. */}
      <div
        className="relative overflow-hidden rounded-lg border border-line bg-sunken"
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- plain img: no remote optimisation (zero-cost hosting) */}
        <img
          ref={imageRef}
          src={fallback.url}
          srcSet={sources.map((source) => `${source.url} ${source.width}w`).join(", ")}
          sizes={SIZES}
          width={photo.width}
          height={photo.height}
          alt={labels.alt.replace("{name}", carName)}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
        <span aria-hidden="true" className="absolute top-2 left-2">
          <IndicativeTag>{labels.marker}</IndicativeTag>
        </span>
      </div>
      <figcaption className="mt-2 text-xs text-ink-muted [overflow-wrap:anywhere]">
        {fill(publicDomain ? labels.creditPublicDomain : labels.credit, {
          author,
          license: photo.licenseUrl ? (
            <ExternalLink href={photo.licenseUrl}>{licenseText}</ExternalLink>
          ) : (
            licenseText
          ),
          source: <ExternalLink href={photo.sourceUrl}>{labels.source}</ExternalLink>,
        })}
      </figcaption>
    </figure>
  );
}
