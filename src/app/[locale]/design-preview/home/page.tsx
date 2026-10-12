import { HomeScreen } from "../_components/HomeScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Home. */
export default async function HomePreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <HomeScreen locale={locale} path={`${P}/home`} />;
}
