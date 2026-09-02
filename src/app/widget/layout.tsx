import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout minimalista sin el layout global del dashboard
  return <RequestIntlProvider>{children}</RequestIntlProvider>;
}
