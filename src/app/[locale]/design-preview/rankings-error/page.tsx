import { RankingsScreen } from "../_components/RankingsScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Rankings: inline error. */
export default async function RankingsErrorPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <RankingsScreen locale={locale} path={`${P}/rankings-error`} state="error" />;
}
