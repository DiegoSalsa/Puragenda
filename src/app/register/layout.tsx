import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("register");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
