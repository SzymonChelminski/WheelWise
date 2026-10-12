import { Container } from "@/components/layout/SiteShell";
import type { Locale } from "@/components/ui/format";
import { EstimateNote } from "@/components/ui/Markers";
import { LinkList } from "@/components/ui/MetricSelector";
import { RankingList } from "@/components/ui/RankingItem";
import { h2Class, linkClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import {
  mockLongNamesByPrice,
  mockLongNamesByTotalCost,
  mockRankingByTotalCost,
  mockTopByPrice,
} from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import { P } from "../_lib/view";
import { CostRow, PreviewSearch, PriceRow } from "./parts";
import { PreviewShell } from "./PreviewShell";

export function HomeScreen({
  locale,
  path,
  longNames = false,
}: {
  locale: Locale;
  path: string;
  /** Fill both lists with names of about 100 characters. */
  longNames?: boolean;
}) {
  const t = copy[locale];
  const topPrice = longNames ? mockLongNamesByPrice : mockTopByPrice;
  const topCost = longNames ? mockLongNamesByTotalCost : mockRankingByTotalCost.slice(0, 5);
  const maxPrice = topPrice[topPrice.length - 1].value;
  const maxCost = topCost[topCost.length - 1].value;
  const listLink = `${linkClass} inline-flex min-h-11 items-center font-semibold`;

  return (
    <PreviewShell locale={locale} path={path}>
      <section data-surface="dark" className="bg-brand-strong text-on-brand">
        <Container className="pt-8 pb-10 md:pt-14 md:pb-16">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] md:text-4xl">
              {t.home.title}
            </h1>
            <p className="mt-3 text-lg text-on-brand-muted">{t.home.intro}</p>
            <PreviewSearch
              locale={locale}
              size="lg"
              className="mt-6"
              defaultQuery={longNames ? "compass" : undefined}
            />
          </div>
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-2">
          <section aria-labelledby="top-price">
            <h2 id="top-price" className={h2Class}>
              {t.home.topPriceTitle}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t.metrics.price.description}</p>
            <RankingList label={t.home.topPriceTitle} className="mt-4">
              {topPrice.map((item) => (
                <PriceRow key={item.car.slug} item={item} locale={locale} max={maxPrice} />
              ))}
            </RankingList>
            <p className="mt-3">
              <Link href={`${P}/rankings`} className={listLink}>
                {t.home.topPriceLink}
              </Link>
            </p>
          </section>

          <section aria-labelledby="top-cost">
            <h2 id="top-cost" className={h2Class}>
              {t.home.topCostTitle}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t.home.topCostNote}</p>
            <RankingList label={t.home.topCostTitle} className="mt-4">
              {topCost.map((item) => (
                <CostRow
                  key={item.car.slug}
                  item={item}
                  locale={locale}
                  max={maxCost}
                  detail={false}
                />
              ))}
            </RankingList>
            <p className="mt-3">
              <Link href={`${P}/rankings`} className={listLink}>
                {t.home.topCostLink}
              </Link>
            </p>
          </section>
        </div>

        <section aria-labelledby="all-rankings" className="mt-14">
          <h2 id="all-rankings" className={h2Class}>
            {t.home.allRankingsTitle}
          </h2>
          <LinkList
            label={t.home.allRankingsTitle}
            className="mt-4"
            items={Object.entries(t.metrics).map(([key, metric]) => ({
              href: `${P}/rankings?metric=${key}`,
              title: metric.label,
              description: metric.description,
            }))}
          />
        </section>

        <EstimateNote className="mt-8">
          {t.home.estimateNote}{" "}
          <Link href={`${P}/methodology`} className={linkClass}>
            {t.common.howWeCount}
          </Link>
        </EstimateNote>
      </Container>
    </PreviewShell>
  );
}
