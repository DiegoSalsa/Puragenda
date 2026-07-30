import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PaymentWall } from "@/components/dashboard/payment-wall";
import { ChangelogPopup } from "@/components/dashboard/changelog-popup";
import { DashboardOverlayProvider } from "@/components/dashboard/dashboard-overlay-context";
import { LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import type { Metadata } from "next";
import { ContextualHelpButton } from "@/components/dashboard/contextual-help";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { hasDunningAccess } from "@/server/services/subscription-dunning.service";

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

  // Check subscription status — block access if INACTIVE (pending payment)
  if (business && user.role !== "SUPERADMIN") {
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    const pastDueAccessExpired =
      subscription?.status === "PAST_DUE" &&
      !hasDunningAccess(subscription);

    if (subscription?.status === "INACTIVE" || pastDueAccessExpired) {
      return (
        <PaymentWall 
          userEmail={user.email} 
          userName={user.name}
          businessId={business.id} 
          businessName={business.name}
          plan={subscription.plan} 
          reason={pastDueAccessExpired ? "past_due" : "pending"}
        />
      );
    }
  }

  const changelogSeenVersion = (await cookies()).get("puragenda_changelog_seen")?.value;
  const shouldShowChangelogPopup = changelogSeenVersion !== LATEST_CHANGELOG_VERSION;

  return (
    <DashboardOverlayProvider initialChangelogOpen={shouldShowChangelogPopup}>
      <div className="flex fixed inset-0 overflow-hidden bg-background">
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
            <div className="min-w-0 max-w-full px-4 pb-6 pt-[72px] sm:p-6 md:pt-6 xl:p-8">{children}</div>
          </main>
        </div>
        <div className="md:hidden">
          <ContextualHelpButton />
        </div>
        <ChangelogPopup />
      </div>
    </DashboardOverlayProvider>
  );
}
