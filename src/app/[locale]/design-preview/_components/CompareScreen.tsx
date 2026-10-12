import { Container } from "@/components/layout/SiteShell";
import { AssumptionsSummary } from "@/components/ui/AssumptionsPanel";
import { ButtonLink } from "@/components/ui/Button";
import { SegmentedSwitch } from "@/components/ui/Choice";
import { ComparisonTable } from "@/components/ui/ComparisonTable";
import { ComparisonSkeleton, EmptyState } from "@/components/ui/Feedback";
import type { Locale } from "@/components/ui/format";
import { EstimateNote, InfoNote } from "@/components/ui/Markers";
import { SheetDisclosure } from "@/components/ui/Sheet";
import { h1Class, h3Class, linkClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { mockCars } from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import { comparison, P, powerKind } from "../_lib/view";
import { assumptionsSummary, PreviewAssumptions, PreviewSearch } from "./parts";
import { PreviewShell } from "./PreviewShell";

export function CompareScreen({
  locale,
  path,
  slugs,
  loading = false,
}: {
  locale: Locale;
  path: string;
  /** 0 to 3 cars. Fewer than 2 shows the empty state. */
  slugs: string[];
  loading?: boolean;
}) {
  const t = copy[locale];
  const enough = slugs.length >= 2;
  // The power note is needed only when a figure is not plain engine power.
  const powerNote = slugs.some(
    (slug) => powerKind(mockCars.find((car) => car.slug === slug)!) !== "plain",
  );

  return (
    <PreviewShell locale={locale} path={path} current="compare" compareSlugs={slugs}>
      <Container className="py-8 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <h1 className={h1Class}>{t.compare.title}</h1>
          {enough && (
            <SegmentedSwitch
              name="period"
              legend={t.period.legend}
              defaultValue="month"
              options={[
                { value: "month", label: t.period.month },
                { value: "year", label: t.period.year },
              ]}
            />
          )}
        </div>

        {!enough && (
          <EmptyState
            className="mt-6"
            title={slugs.length === 1 ? t.compare.emptyOneTitle : t.compare.emptyTitle}
            actions={
              <ButtonLink href={`${P}/rankings`} variant="secondary">
                {t.compare.toRankings}
              </ButtonLink>
            }
          >
            <p>{t.compare.emptyText}</p>
            <PreviewSearch locale={locale} className="mt-5 max-w-md" />
          </EmptyState>
        )}

        {enough && (
          <>
            <AssumptionsSummary
              className="mt-6"
              label={t.assumptions.title}
              summary={assumptionsSummary(locale)}
              action={
                <SheetDisclosure
                  triggerLabel={t.assumptions.change}
                  triggerSize="sm"
                  title={t.assumptions.title}
                  closeLabel={t.common.close}
                  applyLabel={t.assumptions.done}
                >
                  <PreviewAssumptions locale={locale} idPrefix="sheet-a" />
                </SheetDisclosure>
              }
            />

            {loading ? (
              <div className="mt-4">
                <ComparisonSkeleton
                  columns={slugs.length === 3 ? 3 : 2}
                  label={t.compare.loading}
                />
              </div>
            ) : (
              <ComparisonTable
                className="mt-4"
                {...comparison(slugs, "month", locale)}
                labels={{
                  caption: t.compare.caption(t.common.perMonth),
                  rowHeader: t.compare.rowHeader,
                  remove: t.compare.remove,
                  removeShort: t.compare.removeShort,
                  estimateSr: t.common.estimateSr,
                  cars: t.compare.cars,
                }}
                footer={
                  powerNote && (
                    <InfoNote>
                      {t.power.compareNote}{" "}
                      <Link
                        href={`${P}/methodology#${t.power.methodologyAnchor}`}
                        className={linkClass}
                      >
                        {t.power.methodologyLink}
                      </Link>
                    </InfoNote>
                  )
                }
              />
            )}

            <EstimateNote className="mt-4">
              {t.rankings.estimateNote}{" "}
              <Link href={`${P}/methodology`} className={linkClass}>
                {t.common.howWeCount}
              </Link>
            </EstimateNote>

            {slugs.length === 2 && (
              <section aria-labelledby="add-third" className="mt-10 max-w-md">
                <h2 id="add-third" className={h3Class}>
                  {t.compare.addThirdTitle}
                </h2>
                <PreviewSearch locale={locale} className="mt-3" />
              </section>
            )}
          </>
        )}
      </Container>
    </PreviewShell>
  );
}
