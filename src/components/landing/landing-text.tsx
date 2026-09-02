"use client";

import { useTranslations } from "next-intl";
import { WordCarousel } from "@/components/landing/word-carousel";

export function LandingText({ id }: { id: string }) {
  const t = useTranslations("landing");
  return <>{t(id)}</>;
}

export function LocalizedWordCarousel({ className }: { className?: string }) {
  const t = useTranslations("landing");
  return <WordCarousel className={className} words={t("carousel").split("|")} />;
}
