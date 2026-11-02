import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";
import { Logo } from "@/components/ui/Logo";

/*
 * Page frame: skip link, header, main, footer. Header and footer are dark
 * petrol surfaces (data-surface="dark" switches the focus ring to amber).
 */

/** Width and side padding shared by every page section. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-page px-4 md:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

/** First focusable element on every page. Visible only when focused. */
export function SkipLink({ children }: { children: ReactNode }) {
  return (
    <a
      href="#main"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:rounded-md focus-visible:bg-signal focus-visible:px-4 focus-visible:font-semibold focus-visible:text-on-signal data-[demo~=focus]:not-sr-only data-[demo~=focus]:inline-flex data-[demo~=focus]:min-h-11 data-[demo~=focus]:items-center data-[demo~=focus]:rounded-md data-[demo~=focus]:bg-signal data-[demo~=focus]:px-4 data-[demo~=focus]:font-semibold data-[demo~=focus]:text-on-signal"
    >
      {children}
    </a>
  );
}

export interface NavItem {
  href: string;
  label: string;
  current?: boolean;
  /** Small count after the label (cars in the comparison). */
  badge?: string;
  /** Spoken description of the badge: "w porównaniu: 2". */
  badgeLabel?: string;
}

export function Header({
  locale,
  pathname,
  nav,
  labels,
}: {
  locale: "pl" | "en";
  /** Current path without the locale prefix; the language switcher keeps it. */
  pathname: string;
  nav: NavItem[];
  labels: {
    /** Accessible name of the logo link: "WheelWise, strona główna". */
    homeLink: string;
    nav: string;
    language: string;
    languageNames: { pl: string; en: string };
  };
}) {
  return (
    <header data-surface="dark" className="bg-brand-strong text-on-brand">
      <Container className="flex flex-wrap items-center gap-x-8 md:min-h-16">
        <Link
          href="/"
          aria-label={labels.homeLink}
          className="order-1 inline-flex min-h-13 items-center rounded-sm md:min-h-11"
        >
          <Logo />
        </Link>

        <nav aria-label={labels.nav} className="order-3 w-full md:order-2 md:w-auto">
          <ul role="list" className="-mx-3 flex md:mx-0 md:gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 px-3 text-base text-on-brand -outline-offset-3 transition-colors duration-(--duration-fast) md:min-h-16",
                    item.current
                      ? "font-semibold shadow-[inset_0_-3px_0_var(--color-signal)]"
                      : "font-medium hover:shadow-[inset_0_-3px_0_var(--color-on-brand-muted)]",
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-signal px-1.5 text-xs leading-5 font-semibold text-on-signal tabular-nums">
                      <span aria-hidden="true">{item.badge}</span>
                      <span className="sr-only">({item.badgeLabel})</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={labels.language} className="order-2 ml-auto md:order-3">
          <ul
            role="list"
            className="flex rounded-md p-[3px] shadow-[inset_0_0_0_1px_var(--color-on-brand-muted)]"
          >
            {(["pl", "en"] as const).map((code) => (
              <li key={code}>
                <Link
                  href={pathname}
                  locale={code}
                  lang={code}
                  hrefLang={code}
                  aria-current={code === locale ? "true" : undefined}
                  className={cn(
                    "relative inline-flex min-h-8 min-w-10 items-center justify-center rounded-sm px-2 text-sm font-semibold transition-colors duration-(--duration-fast) pointer-coarse:after:absolute pointer-coarse:after:-inset-y-1.5 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']",
                    code === locale
                      ? "bg-surface text-brand-strong"
                      : "text-on-brand hover:bg-brand",
                  )}
                >
                  {code.toUpperCase()}
                  <span className="sr-only"> {labels.languageNames[code]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  );
}

export function Footer({
  nav,
  labels,
  children,
}: {
  nav: { href: string; label: string }[];
  labels: {
    about: string;
    nav: string;
    sourcesTitle: string;
    sources: string[];
    disclaimer: string;
  };
  /** Slot for <DataFreshness tone="dark">. */
  children?: ReactNode;
}) {
  const link =
    "inline-flex min-h-9 items-center text-sm text-on-brand underline pointer-coarse:min-h-11 decoration-1 underline-offset-[3px] hover:decoration-2";
  return (
    <footer data-surface="dark" className="mt-auto bg-brand-deep pb-(--bar-space) text-on-brand">
      <Container className="grid gap-x-12 gap-y-8 py-10 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.4fr)] md:py-12">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-on-brand-muted">{labels.about}</p>
        </div>
        <nav aria-label={labels.nav}>
          <ul role="list">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold text-on-brand">{labels.sourcesTitle}</h2>
          <ul role="list" className="mt-2 space-y-1 text-sm text-on-brand-muted">
            {labels.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 border-t border-brand pt-6 md:col-span-3">
          <p className="max-w-3xl text-xs text-on-brand-muted">{labels.disclaimer}</p>
          {children}
        </div>
      </Container>
    </footer>
  );
}

export function SiteShell({
  skipLabel,
  header,
  footer,
  compareBar,
  children,
}: {
  /** "Przejdź do treści" */
  skipLabel: string;
  header: ReactNode;
  footer: ReactNode;
  /** Slot for <CompareBar>. When present, the page keeps room for it at the bottom. */
  compareBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col",
        // --bar-height is measured by CompareBar; 6.5rem covers the time before it is known.
        compareBar ? "[--bar-space:var(--bar-height,6.5rem)]" : undefined,
      )}
    >
      <SkipLink>{skipLabel}</SkipLink>
      {header}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {footer}
      {compareBar}
    </div>
  );
}
