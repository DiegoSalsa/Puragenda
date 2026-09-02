import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <RequestIntlProvider>{children}</RequestIntlProvider>;
}
