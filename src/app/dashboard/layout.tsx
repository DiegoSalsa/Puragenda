import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PaymentWall } from "@/components/dashboard/payment-wall";
import { ChangelogPopup } from "@/components/dashboard/changelog-popup";
import { DashboardOverlayProvider } from "@/components/dashboard/dashboard-overlay-context";
import { CHANGELOG_DATA } from "@/config/changelog";
import type { Metadata } from "next";
import { ContextualHelpButton } from "@/components/dashboard/contextual-help";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { isLocalPaymentSimulatorEnabled } from "@/server/services/local-payment-simulator";
import { RequestIntlProvider } from "@/components/i18n/request-intl-provider";
import { getDashboardPaymentWallReason } from "@/lib/dashboard/subscription-gate";
import { isDemoAccountEmail } from "@/server/auth/demo-session";
import { PuriAssistant } from "@/components/dashboard/puri-assistant";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  const business = await getBusinessForUser(user.id);
  const permissions = business ? await getEffectiveBusinessPermissions(user, business) : [];

  // Operational access is time-aware: an expired trial is blocked even before cron runs.
  if (business && user.role !== "SUPERADMIN") {
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    const paymentWallReason = getDashboardPaymentWallReason(subscription, new Date(), {
      demoAccount: isDemoAccountEmail(user.email),
    });

    if (paymentWallReason) {
      return (
        <RequestIntlProvider>
        <PaymentWall 
          userEmail={user.email} 
          userName={user.name}
          businessId={business.id} 
          businessName={business.name}
          countryCode={business.countryCode}
          plan={subscription?.plan ?? "INDIVIDUAL"}
          paymentSimulatorEnabled={isLocalPaymentSimulatorEnabled()}
          reason={paymentWallReason}
        />
        </RequestIntlProvider>
      );
    }
  }

  const changelogSeenVersion = (await cookies()).get("puragenda_changelog_seen")?.value;
  const launchEnabled = process.env.WEBSITE_LAUNCH_ENABLED === "1" && !!business && business.ownerId === user.id;
  const websiteLaunch = launchEnabled ? { offer: await prisma.websiteOfferEligibility.findUnique({ where: { businessId: business!.id } }), addon: await prisma.websiteAddon.findUnique({ where: { businessId: business!.id } }), canManage: true } : null;
  const LATEST_CHANGELOG_VERSION = CHANGELOG_DATA[launchEnabled ? 0 : 1].version;
  const shouldShowChangelogPopup = changelogSeenVersion !== LATEST_CHANGELOG_VERSION;

  return (
    <RequestIntlProvider>
    <DashboardOverlayProvider initialChangelogOpen={shouldShowChangelogPopup}>
      <div className="fixed inset-0 flex min-h-[100dvh] min-w-0 max-w-full overflow-hidden bg-background">
        <DashboardSidebar
          userName={user.name}
          widgetSlug={business?.slug}
          userRole={user.role}
          productionOrdersEnabled={business?.productionOrdersEnabled}
          permissions={permissions}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="hidden h-14 shrink-0 items-center justify-end border-b border-border/70 bg-background/95 px-5 backdrop-blur md:flex">
            <ContextualHelpButton />
          </header>
          <main id="tutorial-main" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="dashboard-content w-full min-w-0 max-w-full px-4 pt-[72px] sm:px-6 sm:pt-6 xl:px-8 xl:pt-8">{children}</div>
          </main>
        </div>
        <div className="md:hidden">
          <ContextualHelpButton />
        </div>
        {business ? <PuriAssistant /> : null}
        <ChangelogPopup websiteLaunch={websiteLaunch} />
      </div>
    </DashboardOverlayProvider>
    </RequestIntlProvider>
  );
}
