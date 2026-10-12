import localFont from "next/font/local";

/*
 * Barlow and Barlow Semi Condensed (SIL Open Font License 1.1, see fonts/OFL.txt).
 * The files are subset to Basic Latin, Latin-1 and Latin Extended-A/B (Polish
 * diacritics included) and are served by Next.js itself: no external font host.
 */
export const barlow = localFont({
  src: [
    { path: "./fonts/Barlow-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Barlow-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Barlow-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const barlowSemiCondensed = localFont({
  src: [
    {
      path: "./fonts/BarlowSemiCondensed-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-barlow-semi-condensed",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** Put this on <html>. */
export const fontVariables = `${barlow.variable} ${barlowSemiCondensed.variable}`;
