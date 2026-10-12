import { Container } from "@/components/layout/SiteShell";
import { Icon } from "@/components/ui/Icon";
import { DataTable, Notice, Prose } from "@/components/ui/Prose";
import { h1Class, linkClass } from "@/components/ui/styles";
import { methodologyCopy } from "@/mocks/methodology";
import { PreviewShell } from "../_components/PreviewShell";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

export default async function MethodologyPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  const t = methodologyCopy[locale];

  return (
    <PreviewShell locale={locale} path={`${P}/methodology`} current="methodology">
      <Container className="py-8 md:py-12">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <article className="min-w-0">
            <h1 className={h1Class}>{t.title}</h1>
            <p className="mt-4 max-w-prose text-lg text-ink-muted">{t.intro}</p>

            <Prose className="mt-2">
              {t.sections.map((section) => (
                <section key={section.id} aria-labelledby={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list && (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </Prose>

            <DataTable
              className="mt-12"
              caption={t.sourcesCaption}
              columns={t.sourcesColumns}
              rows={t.sources.map((source) => [
                <a
                  key="link"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${linkClass} inline-flex min-h-6 items-center gap-1`}
                >
                  {source.name}
                  <Icon name="external" size={16} />
                </a>,
                source.what,
                source.updated,
                source.licence,
              ])}
            />

            <Notice className="mt-10" title={t.disclaimerTitle}>
              {t.disclaimers.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </Notice>

          </article>

          <nav aria-label={t.tocLabel} className="order-first lg:order-none">
            <div className="lg:sticky lg:top-6">
              <p className="text-sm font-semibold text-ink">{t.tocLabel}</p>
              <ul role="list" className="mt-2 border-l border-line">
                {[...t.sections.map((s) => ({ id: s.id, label: s.heading }))].map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="-ml-px flex min-h-9 items-center pointer-coarse:min-h-11 border-l border-transparent py-1 pl-4 text-sm text-ink-muted transition-colors duration-(--duration-fast) hover:border-brand hover:text-ink"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </Container>
    </PreviewShell>
  );
}
