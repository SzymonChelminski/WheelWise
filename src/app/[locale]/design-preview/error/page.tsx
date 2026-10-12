import { Container } from "@/components/layout/SiteShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { h1Class } from "@/components/ui/styles";
import { copy } from "@/mocks/copy";
import { PreviewShell } from "../_components/PreviewShell";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Layout of the error page. The real one is src/app/[locale]/error.tsx. */
export default async function ErrorPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  const t = copy[locale];

  return (
    <PreviewShell locale={locale} path={`${P}/error`}>
      <Container className="py-12 md:py-20">
        <div className="max-w-xl">
          <Icon name="alert" size={24} className="text-danger" />
          <h1 className={`${h1Class} mt-2`}>{t.error.title}</h1>
          <p className="mt-4 text-lg text-ink-muted">{t.error.text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button icon="refresh">{t.common.retry}</Button>
            <ButtonLink href={`${P}/home`} variant="secondary">
              {t.common.home}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </PreviewShell>
  );
}
