import type { Metadata } from "next";
import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/crawler-policy";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout minimalista sin el layout global del dashboard
  return <RequestIntlProvider>{children}</RequestIntlProvider>;
}
