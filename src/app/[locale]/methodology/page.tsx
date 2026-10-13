import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/SiteShell";
import { Icon } from "@/components/ui/Icon";
import { DataTable, Notice, Prose } from "@/components/ui/Prose";
import { h1Class, linkClass } from "@/components/ui/styles";
import { pageMetadata } from "@/components/features/shell/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return pageMetadata((await params).locale, "methodology", "/methodology");
}

// Order of the sections on the page; the texts are in the messages under methodology.sections.
const SECTIONS = ["prices", "costs", "estimates", "power", "income", "freshness"] as const;

interface SourceRow {
  name: string;
  url: string;
  what: string;
  updated: string;
  licence: string;
}

export default async function MethodologyPage() {
  const t = await getTranslations("methodology");

  const sections = SECTIONS.map((key) => {
    const path = `sections.${key}`;
    return {
      id: t(`${path}.id`),
      // The same section is also reachable under the id the other language uses.
      otherId: t.has(`${path}.otherId`) ? t(`${path}.otherId`) : null,
      heading: t(`${path}.heading`),
      paragraphs: t.raw(`${path}.paragraphs`) as string[],
      list: t.has(`${path}.list`) ? (t.raw(`${path}.list`) as string[]) : null,
      after: t.has(`${path}.after`) ? (t.raw(`${path}.after`) as string[]) : null,
    };
  });
  const sources = t.raw("sources.rows") as SourceRow[];

  return (
    <Container className="py-8 md:py-12">
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0">
          <h1 className={h1Class}>{t("title")}</h1>
          <p className="mt-4 max-w-prose text-lg text-ink-muted">{t("intro")}</p>

          <Prose className="mt-2">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                {section.otherId && <span id={section.otherId} />}
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
                {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </Prose>

          <DataTable
            className="mt-12"
            caption={t("sources.caption")}
            columns={t.raw("sources.columns") as string[]}
            rows={sources.map((source) => [
              <a
                key="link"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
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

          <Notice className="mt-10" title={t("disclaimerTitle")}>
            {(t.raw("disclaimers") as string[]).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </Notice>
        </article>

        <nav aria-label={t("tocLabel")} className="order-first lg:order-none">
          <div className="lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-ink">{t("tocLabel")}</p>
            <ul role="list" className="mt-2 border-l border-line">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px flex min-h-9 items-center border-l border-transparent py-1 pl-4 text-sm text-ink-muted transition-colors duration-(--duration-fast) hover:border-brand hover:text-ink pointer-coarse:min-h-11"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </Container>
  );
}
