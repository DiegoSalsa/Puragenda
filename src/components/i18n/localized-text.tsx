"use client";

import { useTranslations } from "next-intl";

/**
 * Migration-safe translation boundary for static JSX copy. Dynamic sentences
 * remain on explicit, named keys so translators can reorder their variables.
 */
export function LocalizedText({ id }: { id: string }) {
  const t = useTranslations("legacy");
  return <>{t(id)}</>;
}
