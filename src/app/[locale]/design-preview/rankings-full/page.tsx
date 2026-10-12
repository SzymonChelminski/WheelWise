import { RankingsScreen } from "../_components/RankingsScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Rankings: three cars selected and a fourth was tried; the bar shows the limit message. */
export default async function RankingsFullPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <RankingsScreen locale={locale} path={`${P}/rankings-full`} state="full" />;
}
