import type { Metadata } from "next";
import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/crawler-policy";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <RequestIntlProvider>{children}</RequestIntlProvider>;
}
