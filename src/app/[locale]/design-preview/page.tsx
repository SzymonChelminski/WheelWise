import { Container } from "@/components/layout/SiteShell";
import { h1Class, linkClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { PreviewShell } from "./_components/PreviewShell";
import { assertDesignPreview, P, toLocale } from "./_lib/view";

/* Index of the design preview. Labels of this page itself are in English: it is a tool for the team. */
const PAGES: [path: string, label: string][] = [
  ["/home", "1. Home"],
  ["/home-long-names", "1. Home: very long car names"],
  ["/rankings", "2. Rankings"],
  ["/rankings-filters-open", "2. Rankings: filters sheet open"],
  ["/rankings-assumptions-open", "2. Rankings: assumptions sheet open"],
  ["/rankings-empty", "2. Rankings: no results"],
  ["/rankings-error", "2. Rankings: error"],
  ["/rankings-loading", "2. Rankings: loading"],
  ["/rankings-consumption", "2. Rankings: fuel consumption, with its note"],
  ["/rankings-full", "2. Rankings: comparison full, fourth-car message"],
  ["/rankings-long-names", "2. Rankings: very long car names"],
  ["/car", "3. Car details: petrol"],
  ["/car-electric", "3. Car details: electric (power per source data)"],
  ["/car-long-name", "3. Car details: hybrid, 103-character name, comparison full"],
  ["/compare", "4. Comparison: 3 cars (petrol, hybrid, electric)"],
  ["/compare-long-names", "4. Comparison: 3 cars with the 103-character name"],
  ["/compare-2-cars", "4. Comparison: 2 cars sharing one name"],
  ["/compare-1-car", "4. Comparison: 1 car (empty state)"],
  ["/compare-empty", "4. Comparison: no cars (empty state)"],
  ["/compare-loading", "4. Comparison: loading"],
  ["/methodology", "5. Methodology"],
  ["/not-found", "6. Not found (404)"],
  ["/error", "6. Error"],
  ["/components", "Components and states"],
];

export default async function DesignPreviewIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <PreviewShell locale={locale} path={P}>
      <Container className="py-8 md:py-12">
        <h1 className={h1Class}>Design preview</h1>
        <p className="mt-3 max-w-prose text-ink-muted">
          Static layouts built from src/components and src/mocks. Specification: design/DESIGN.md.
        </p>
        <ul role="list" className="mt-6">
          {PAGES.map(([path, label]) => (
            <li key={path}>
              <Link href={`${P}${path}`} className={`${linkClass} inline-flex min-h-9 items-center pointer-coarse:min-h-11`}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </PreviewShell>
  );
}
