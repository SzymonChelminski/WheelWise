import { HomeScreen } from "../_components/HomeScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Home: both lists filled with names of about 100 characters. */
export default async function HomeLongNamesPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <HomeScreen locale={locale} path={`${P}/home-long-names`} longNames />;
}
