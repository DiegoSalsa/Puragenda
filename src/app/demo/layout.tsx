import type { Metadata } from "next";
import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/crawler-policy";

export const metadata: Metadata = {
  title: "Demo",
  robots: {
    ...PRIVATE_PAGE_ROBOTS,
    googleBot: { index: false, follow: false },
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <RequestIntlProvider>{children}</RequestIntlProvider>;
}
