import { RankingsScreen } from "../_components/RankingsScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Rankings: names of about 100 characters. */
export default async function RankingsLongNamesPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <RankingsScreen locale={locale} path={`${P}/rankings-long-names`} state="long-names" />;
}
