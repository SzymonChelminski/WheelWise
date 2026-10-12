import { Container } from "@/components/layout/SiteShell";
import { ButtonLink } from "@/components/ui/Button";
import { h1Class } from "@/components/ui/styles";
import { copy } from "@/mocks/copy";
import { PreviewSearch } from "../_components/parts";
import { PreviewShell } from "../_components/PreviewShell";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Layout of the 404 page. The real one is src/app/[locale]/not-found.tsx. */
export default async function NotFoundPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  const t = copy[locale];

  return (
    <PreviewShell locale={locale} path={`${P}/not-found`}>
      <Container className="py-12 md:py-20">
        <div className="max-w-xl">
          <h1 className={h1Class}>{t.notFound.title}</h1>
          <p className="mt-4 text-lg text-ink-muted">{t.notFound.text}</p>
          <PreviewSearch locale={locale} className="mt-6" />
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`${P}/rankings`}>{t.notFound.toRankings}</ButtonLink>
            <ButtonLink href={`${P}/home`} variant="secondary">
              {t.common.home}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </PreviewShell>
  );
}
