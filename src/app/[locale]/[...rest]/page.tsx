import { notFound } from "next/navigation";

// Any path under a locale that no other page handles shows the localised not-found page.
export default function UnknownPage() {
  notFound();
}
