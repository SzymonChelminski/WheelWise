import { RankingsScreen } from "../_components/RankingsScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

export default async function RankingsPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <RankingsScreen locale={locale} path={`${P}/rankings`} />;
}
